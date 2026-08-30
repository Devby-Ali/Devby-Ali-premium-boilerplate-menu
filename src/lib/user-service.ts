// src/lib/user-service.ts
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { env } from "@/lib/env";
import { rolesCol, usersCol, type RoleDoc, type UserDoc } from "@/server/db";
import type { RoleName } from "@/types";

export const ROLE_NAMES: readonly RoleName[] = ["SuperAdmin", "Manager", "Staff"];

export interface UserWithRole {
  user: UserDoc;
  role: RoleDoc | null;
}

async function attachRole(user: UserDoc): Promise<UserWithRole> {
  if (!user.roleId) return { user, role: null };
  const role = await (await rolesCol()).findOne({ _id: user.roleId });
  return { user, role };
}

export async function findUserByEmail(email: string): Promise<UserWithRole | null> {
  const col = await usersCol();
  const user = await col.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
  return user ? attachRole(user) : null;
}

export async function findUserByPhone(phone: string): Promise<UserWithRole | null> {
  const col = await usersCol();
  const user = await col.findOne({ phone });
  return user ? attachRole(user) : null;
}

export async function ensureInitialAdmin(): Promise<UserWithRole> {
  const roles = await rolesCol();
  const users = await usersCol();

  let role = await roles.findOne({ name: "SuperAdmin" });
  if (!role) {
    const now = new Date();
    const doc: RoleDoc = {
      _id: new ObjectId(),
      name: "SuperAdmin",
      description: "Super Administrator",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await roles.insertOne(doc);
      role = doc;
    } catch {
      role = await roles.findOne({ name: "SuperAdmin" });
      if (!role) throw new Error("Failed to create SuperAdmin role");
    }
  }

  const email = env.ADMIN_INITIAL_EMAIL.toLowerCase();
  const existing = await users.findOne({ email });
  if (existing) return { user: existing, role };

  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: "Super Administrator",
    email,
    phone: null,
    passwordHash: await bcrypt.hash(env.ADMIN_INITIAL_PASSWORD, 12),
    roleId: role._id,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(doc);
  return { user: doc, role };
}

// ─────────────────────────────────────────────
//  RBAC — مدیریت کاربران (فقط SuperAdmin)
// ─────────────────────────────────────────────

async function ensureRole(name: RoleName): Promise<RoleDoc> {
  const roles = await rolesCol();
  const existing = await roles.findOne({ name });
  if (existing) return existing;

  // نقش‌های سه‌گانه RBAC همیشه باید موجود باشند؛ در صورت حذف دستی بازسازی می‌شوند
  const now = new Date();
  const doc: RoleDoc = {
    _id: new ObjectId(),
    name,
    description: name,
    isDefault: name === "SuperAdmin",
    createdAt: now,
    updatedAt: now,
  };
  try {
    await roles.insertOne(doc);
  } catch {
    const raced = await roles.findOne({ name });
    if (!raced) throw new Error(`Failed to ensure role ${name}`);
    return raced;
  }
  return doc;
}

async function countActiveSuperAdmins(): Promise<number> {
  const superRole = await (await rolesCol()).findOne({ name: "SuperAdmin" });
  if (!superRole) return 0;
  const users = await usersCol();
  return users.countDocuments({ roleId: superRole._id, isActive: true });
}

export async function listUsers(): Promise<UserWithRole[]> {
  const col = await usersCol();
  const docs = await col.find().sort({ createdAt: -1 }).toArray();

  const roles = await rolesCol();
  const roleMap = new Map<string, RoleDoc>(
    (await roles.find().toArray()).map((r) => [r._id.toHexString(), r])
  );

  return docs.map((user) => ({
    user,
    role: user.roleId ? roleMap.get(user.roleId.toHexString()) ?? null : null,
  }));
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
  | { ok: true; user: UserWithRole }
  | { ok: false; error: "DUPLICATE_EMAIL" | "DUPLICATE_PHONE" };

export async function createUser(data: CreateUserData): Promise<CreateUserResult> {
  const email = data.email.toLowerCase();
  if (await findUserByEmail(email)) return { ok: false, error: "DUPLICATE_EMAIL" };
  if (data.phone && (await findUserByPhone(data.phone))) {
    return { ok: false, error: "DUPLICATE_PHONE" };
  }

  const role = await ensureRole(data.roleName);
  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: data.name,
    email,
    phone: data.phone ?? null,
    passwordHash: await bcrypt.hash(data.password, 12),
    roleId: role._id,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await (await usersCol()).insertOne(doc);

  await recordAudit("user.create", data.actorId, { email, role: data.roleName });
  return { ok: true, user: { user: doc, role } };
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
  | { ok: true; user: UserWithRole | null }
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

  // مدیر ارشد فعالِ آخر نباید نقشش تغییر کند یا غیرفعال شود
  const existingRole = existing.roleId
    ? await (await rolesCol()).findOne({ _id: existing.roleId })
    : null;
  const isSelfLastSuperAdmin =
    existingRole?.name === "SuperAdmin" &&
    (data.roleName !== undefined && data.roleName !== "SuperAdmin" || data.isActive === false) &&
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
    if (duplicate && !duplicate.user._id.equals(_id)) {
      return { ok: false, error: "DUPLICATE_EMAIL" };
    }
    update.email = data.email.toLowerCase();
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== existing.phone) {
    const duplicate = await findUserByPhone(data.phone);
    if (duplicate && !duplicate.user._id.equals(_id)) {
      return { ok: false, error: "DUPLICATE_PHONE" };
    }
    update.phone = data.phone;
  }

  if (data.name !== undefined) update.name = data.name;
  if (data.password !== undefined) {
    update.passwordHash = await bcrypt.hash(data.password, 12);
  }
  if (data.isActive !== undefined) update.isActive = data.isActive;

  if (data.roleName !== undefined && data.roleName !== existingRole?.name) {
    const role = await ensureRole(data.roleName);
    update.roleId = role._id;
  }

  await col.updateOne({ _id }, { $set: update });
  await recordAudit("user.update", data.actorId, {
    targetId: data.id,
    fields: Object.keys(update).filter((k) => k !== "updatedAt"),
  });

  const fresh = await col.findOne({ _id });
  if (!fresh) return { ok: true, user: null };
  return { ok: true, user: await attachRole(fresh) };
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

  const role = existing.roleId ? await (await rolesCol()).findOne({ _id: existing.roleId }) : null;
  if (
    role?.name === "SuperAdmin" &&
    existing.isActive &&
    (await countActiveSuperAdmins()) <= 1
  ) {
    return { ok: false, error: "LAST_SUPERADMIN" };
  }

  await col.deleteOne({ _id });
  await recordAudit("user.delete", actorId, { targetId: id, email: existing.email });
  return { ok: true };
}

// ─────────────────────────────────────────────
//  Audit log
// ─────────────────────────────────────────────

async function recordAudit(
  action: string,
  actorId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const { auditLogsCol } = await import("@/server/db");
    await (await auditLogsCol()).insertOne({
      _id: new ObjectId(),
      action,
      actorId: toObjectIdSafe(actorId),
      details,
      createdAt: new Date(),
    });
  } catch (error) {
    // شکست Audit هرگز فلوی اصلی را متوقف نمی‌کند
    console.error("[AUDIT WRITE FAILED]", error);
  }
}

function toObjectIdSafe(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
