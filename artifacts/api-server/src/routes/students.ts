import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateStudentBody,
  CreateStudentResponse,
  DeleteStudentParams,
  GetDashboardSummaryResponse,
  GetStudentParams,
  GetStudentResponse,
  ListStudentsQueryParams,
  ListStudentsResponse,
  UpdateStudentBody,
  UpdateStudentParams,
  UpdateStudentResponse,
} from "@workspace/api-zod";
import { Types } from "mongoose";
import { Counter, Student, toStudentDto, type StudentRecord } from "../models/student";
import { connectMongo } from "../lib/mongo";
import { hasStaffAccess, requireSignedIn, requireStaff } from "../middlewares/staffAccess";

const router: IRouter = Router();

router.get("/staff/access", requireSignedIn, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }

  try {
    res.json({ allowed: await hasStaffAccess(userId) });
  } catch (error) {
    req.log.error({ err: error }, "Could not verify staff access");
    res.status(503).json({ error: "Staff access could not be verified." });
  }
});

router.use(requireStaff);

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMongoId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

router.use(async (req, res, next): Promise<void> => {
  try {
    await connectMongo();
    next();
  } catch (error) {
    req.log.error({ err: error }, "MongoDB is unavailable");
    res.status(503).json({
      error: "MongoDB is unavailable. Check the cluster status and network access settings.",
    });
  }
});

router.get("/students", async (req, res): Promise<void> => {
  const query = ListStudentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const filter: Record<string, unknown> = {};
  if (query.data.status) filter.status = query.data.status;
  if (query.data.program) filter.program = query.data.program;
  if (query.data.q?.trim()) {
    const search = new RegExp(escapeRegex(query.data.q.trim()), "i");
    filter.$or = [
      { studentId: search },
      { firstName: search },
      { lastName: search },
      { email: search },
      { program: search },
    ];
  }

  const students = await Student.find(filter).sort({ createdAt: -1 }).lean();
  res.json(
    ListStudentsResponse.parse(
      students.map((student) => toStudentDto(student as StudentRecord)),
    ),
  );
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const next = await Counter.findOneAndUpdate(
      { _id: "students" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    const studentId = `STU-${new Date().getFullYear()}-${String(next?.seq ?? 1).padStart(4, "0")}`;
    const student = await Student.create({
      ...parsed.data,
      studentId,
      enrollmentDate: new Date(`${parsed.data.enrollmentDate}T00:00:00.000Z`),
      status: parsed.data.status ?? "Active",
    });
    res.status(201).json(CreateStudentResponse.parse(toStudentDto(student)));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ error: "A student with this email already exists." });
      return;
    }
    throw error;
  }
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const id = parseMongoId(params.data.id);
  if (!id) {
    res.status(404).json({ error: "Student not found." });
    return;
  }

  const student = await Student.findById(id).lean();
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  res.json(GetStudentResponse.parse(toStudentDto(student as StudentRecord)));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide at least one field to update." });
    return;
  }

  const id = parseMongoId(params.data.id);
  if (!id) {
    res.status(404).json({ error: "Student not found." });
    return;
  }

  const updates = {
    ...parsed.data,
    ...(parsed.data.enrollmentDate
      ? {
          enrollmentDate: new Date(
            `${parsed.data.enrollmentDate}T00:00:00.000Z`,
          ),
        }
      : {}),
  };
  try {
    const student = await Student.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();
    if (!student) {
      res.status(404).json({ error: "Student not found." });
      return;
    }
    res.json(UpdateStudentResponse.parse(toStudentDto(student as StudentRecord)));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ error: "A student with this email already exists." });
      return;
    }
    throw error;
  }
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = parseMongoId(params.data.id);
  if (!id) {
    res.status(404).json({ error: "Student not found." });
    return;
  }

  const student = await Student.findByIdAndDelete(id);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [totalStudents, activeStudents, inactiveStudents, graduatedStudents, byProgram, recentStudents] =
    await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "Active" }),
      Student.countDocuments({ status: "Inactive" }),
      Student.countDocuments({ status: "Graduated" }),
      Student.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$program", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Student.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

  res.json(
    GetDashboardSummaryResponse.parse({
      totalStudents,
      activeStudents,
      inactiveStudents,
      graduatedStudents,
      byProgram: byProgram.map(({ _id, count }) => ({ program: _id, count })),
      recentStudents: recentStudents.map((student) =>
        toStudentDto(student as StudentRecord),
      ),
    }),
  );
});

export default router;
