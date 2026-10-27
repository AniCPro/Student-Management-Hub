import { clerkClient, getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

const CACHE_TTL_MS = 60_000;
const accessCache = new Map<string, { allowed: boolean; expiresAt: number }>();

function approvedEmails(): Set<string> {
  return new Set(
    (process.env.STAFF_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function hasStaffAccess(userId: string): Promise<boolean> {
  const allowedEmails = approvedEmails();
  if (allowedEmails.size === 0) return false;

  const cached = accessCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.allowed;
  if (cached) accessCache.delete(userId);

  const user = await clerkClient.users.getUser(userId);
  const allowed = user.emailAddresses.some(
    (address) =>
      address.verification?.status === "verified" &&
      allowedEmails.has(address.emailAddress.trim().toLowerCase()),
  );

  accessCache.set(userId, { allowed, expiresAt: Date.now() + CACHE_TTL_MS });
  if (accessCache.size > 500) {
    const oldestKey = accessCache.keys().next().value;
    if (oldestKey) accessCache.delete(oldestKey);
  }
  return allowed;
}

export const requireSignedIn: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  next();
};

export const requireStaff: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }

  try {
    if (!(await hasStaffAccess(userId))) {
      res.status(403).json({ error: "Approved staff access is required." });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Could not verify staff access");
    res.status(503).json({ error: "Staff access could not be verified." });
  }
};
