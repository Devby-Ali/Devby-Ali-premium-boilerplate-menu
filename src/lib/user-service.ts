// src/lib/user-service.ts
// Data service for users & roles (MongoDB driver — see src/server/db.ts).

import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { env } from "@/lib/env";
import { rolesCol, usersCol, type RoleDoc, type UserDoc } from "@/server/db";

export interface UserWithRole {
  user: UserDoc;
  role: RoleDoc | null;
}

async function attachRole(user: UserDoc): Promise<UserWithRole> {
  if (!user.roleId) return { user, role: null };
  const role = await (await rolesCol()).findOne({ _id: user.roleId });
  return { user, role };
}

/** Find an active-capable user by email (case-insensitive), with its role. */
export async function findUserByEmail(email: string): Promise<UserWithRole | null> {
  const col = await usersCol();
  const user = await col.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
  return user ? attachRole(user) : null;
}

/** Find a user by phone number, with its role. */
export async function findUserByPhone(phone: string): Promise<UserWithRole | null> {
  const col = await usersCol();
  const user = await col.findOne({ phone });
  return user ? attachRole(user) : null;
}

/**
 * Ensure the initial admin account exists (ROADMAP F1-T11).
 * Idempotent: creates the `admin` role and the initial admin user from env
 * when missing. Returns the user with role attached.
 */
export async function ensureInitialAdmin(): Promise<UserWithRole> {
  const roles = await rolesCol();
  const users = await usersCol();

  let role = await roles.findOne({ name: "admin" });
  if (!role) {
    const now = new Date();
    const doc: RoleDoc = {
      _id: new ObjectId(),
      name: "admin",
      description: "Administrator",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await roles.insertOne(doc);
      role = doc;
    } catch {
      // Unique-index race — re-read.
      role = await roles.findOne({ name: "admin" });
      if (!role) throw new Error("Failed to create admin role");
    }
  }

  const email = env.ADMIN_INITIAL_EMAIL.toLowerCase();
  const existing = await users.findOne({ email });
  if (existing) return { user: existing, role };

  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: "Administrator",
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
