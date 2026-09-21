// src/lib/user-service.ts
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { usersCol, type UserDoc } from "@/server/db";
import type { RoleName } from "@/types";

export const ROLE_NAMES: readonly RoleName[] = ["SuperAdmin", "Manager", "Staff"];

function isRoleName(value: unknown): value is RoleName {
  return typeof value === "string" && (ROLE_NAMES as readonly string[]).includes(value);
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const col = await usersCol();
  return col.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
}

export async function findUserByPhone(phone: string): Promise<UserDoc | null> {
  const col = await usersCol();
  return col.findOne({ phone });
}

export async function ensureInitialAdmin(): Promise<UserDoc> {
  const users = await usersCol();
  const email = env.ADMIN_INITIAL_EMAIL.toLowerCase();
  const existing = await users.findOne({ email });
  if (existing) {
    if (!isRoleName(existing.role)) {
      await users.updateOne(
        { _id: existing._id },
        { $set: { role: "SuperAdmin", updatedAt: new Date() }, $unset: { roleId: "" } },
      );
      return { ...existing, role: "SuperAdmin" };
    }
    return existing;
  }

  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: "Super Administrator",
    email,
    phone: null,
    passwordHash: await bcrypt.hash(env.ADMIN_INITIAL_PASSWORD, 12),
    role: "SuperAdmin",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(doc);
  return doc;
}

async function countActiveSuperAdmins(): Promise<number> {
  const users = await usersCol();
  return users.countDocuments({ role: "SuperAdmin", isActive: true });
}

export async function listUsers(): Promise<UserDoc[]> {
  const col = await usersCol();
  return col.find().sort({ createdAt: -1 }).toArray();
}

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  roleName: RoleName;
  actorId: string;
}

export type CreateUserResult =
  | { ok: true; user: UserDoc }
  | { ok: false; error: "DUPLICATE_EMAIL" | "DUPLICATE_PHONE" };

export async function createUser(data: CreateUserData): Promise<CreateUserResult> {
  const email = data.email.toLowerCase();
  if (await findUserByEmail(email)) return { ok: false, error: "DUPLICATE_EMAIL" };
  if (data.phone && (await findUserByPhone(data.phone))) {
    return { ok: false, error: "DUPLICATE_PHONE" };
  }

  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: data.name,
    email,
    phone: data.phone ?? null,
    passwordHash: await bcrypt.hash(data.password, 12),
    role: data.roleName,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await (await usersCol()).insertOne(doc);

  await recordAudit("user.create", data.actorId, { email, role: data.roleName });
  return { ok: true, user: doc };
}

export interface UpdateUserData {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  password?: string;
  roleName?: RoleName;
  isActive?: boolean;
  actorId: string;
}

export type UpdateUserResult =
  | { ok: true; user: UserDoc | null }
  | {
      ok: false;
      error:
        | "NOT_FOUND"
        | "DUPLICATE_EMAIL"
        | "DUPLICATE_PHONE"
        | "LAST_SUPERADMIN"
        | "SELF_DEMOTE";
    };

export async function updateUser(data: UpdateUserData): Promise<UpdateUserResult> {
  const _id = toObjectIdSafe(data.id);
  if (!_id) return { ok: false, error: "NOT_FOUND" };

  const col = await usersCol();
  const existing = await col.findOne({ _id });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const isSelfLastSuperAdmin =
    existing.role === "SuperAdmin" &&
    ((data.roleName !== undefined && data.roleName !== "SuperAdmin") ||
      data.isActive === false) &&
    (await countActiveSuperAdmins()) <= 1;

  if (isSelfLastSuperAdmin) {
    if (data.actorId === data.id && data.isActive === false) {
      return { ok: false, error: "SELF_DEMOTE" };
    }
    return { ok: false, error: "LAST_SUPERADMIN" };
  }

  const update: Partial<UserDoc> = { updatedAt: new Date() };

  if (data.email !== undefined && data.email.toLowerCase() !== existing.email) {
    const duplicate = await findUserByEmail(data.email);
    if (duplicate && !duplicate._id.equals(_id)) {
      return { ok: false, error: "DUPLICATE_EMAIL" };
    }
    update.email = data.email.toLowerCase();
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== existing.phone) {
    const duplicate = await findUserByPhone(data.phone);
    if (duplicate && !duplicate._id.equals(_id)) {
      return { ok: false, error: "DUPLICATE_PHONE" };
    }
    update.phone = data.phone;
  }

  if (data.name !== undefined) update.name = data.name;
  if (data.password !== undefined) {
    update.passwordHash = await bcrypt.hash(data.password, 12);
  }
  if (data.isActive !== undefined) update.isActive = data.isActive;
  if (data.roleName !== undefined) update.role = data.roleName;

  await col.updateOne({ _id }, { $set: update, $unset: { roleId: "" } });
  await recordAudit("user.update", data.actorId, {
    targetId: data.id,
    fields: Object.keys(update).filter((k) => k !== "updatedAt"),
  });

  return { ok: true, user: await col.findOne({ _id }) };
}

export type DeleteUserResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "LAST_SUPERADMIN" | "SELF_DELETE" };

export async function deleteUser(id: string, actorId: string): Promise<DeleteUserResult> {
  const _id = toObjectIdSafe(id);
  if (!_id) return { ok: false, error: "NOT_FOUND" };

  if (actorId === id) return { ok: false, error: "SELF_DELETE" };

  const col = await usersCol();
  const existing = await col.findOne({ _id });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  if (
    existing.role === "SuperAdmin" &&
    existing.isActive &&
    (await countActiveSuperAdmins()) <= 1
  ) {
    return { ok: false, error: "LAST_SUPERADMIN" };
  }

  await col.deleteOne({ _id });
  await recordAudit("user.delete", actorId, { targetId: id, email: existing.email });
  return { ok: true };
}

async function recordAudit(
  action: string,
  actorId: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const { auditLogsCol } = await import("@/server/db");
    await (
      await auditLogsCol()
    ).insertOne({
      _id: new ObjectId(),
      action,
      actorId: toObjectIdSafe(actorId),
      details,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[AUDIT WRITE FAILED]", error);
  }
}

function toObjectIdSafe(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
