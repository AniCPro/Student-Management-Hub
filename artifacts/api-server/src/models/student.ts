import mongoose, { Schema, Types } from "mongoose";

const studentStatuses = ["Active", "Inactive", "Graduated"] as const;

const studentSchema = new Schema(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    program: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 8 },
    enrollmentDate: { type: Date, required: true },
    status: {
      type: String,
      enum: studentStatuses,
      required: true,
      default: "Active",
    },
  },
  { timestamps: true, collection: "students" },
);

const counterSchema = new Schema(
  { _id: { type: String, required: true }, seq: { type: Number, default: 0 } },
  { versionKey: false, collection: "counters" },
);

export const Student =
  mongoose.models.Student ?? mongoose.model("Student", studentSchema);
export const Counter =
  mongoose.models.Counter ?? mongoose.model("Counter", counterSchema);

export type StudentRecord = {
  _id: Types.ObjectId;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  program: string;
  year: number;
  enrollmentDate: Date;
  status: (typeof studentStatuses)[number];
  createdAt: Date;
};

export function toStudentDto(student: StudentRecord) {
  return {
    id: student._id.toString(),
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone ?? null,
    program: student.program,
    year: student.year,
    enrollmentDate: student.enrollmentDate.toISOString().slice(0, 10),
    status: student.status,
    createdAt: student.createdAt.toISOString(),
  };
}
