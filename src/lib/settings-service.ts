// src/lib/settings-service.ts
// Data service for site settings (MongoDB driver — see src/server/db.ts).

import { ObjectId } from "mongodb";

import { settingsCol, type SettingDoc } from "@/server/db";

// ------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  siteName: "Premium Menu",
  logoUrl: null,
  primaryColor: "#2f6b4f",
  secondaryColor: "#8b233d",
  accentColor: "#f4e3b2",
  themeMode: "system",
  contactPhone: null,
  contactEmail: "hello@premiummenu.test",
  address: null,
} as const;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface SettingsData {
  siteName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
}

export interface UpdateSettingsInput {
  siteName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  themeMode?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
}

function mapSettings(doc: SettingDoc): SettingsData {
  return {
    siteName: doc.siteName,
    logoUrl: doc.logoUrl ?? null,
    primaryColor: doc.primaryColor,
    secondaryColor: doc.secondaryColor,
    accentColor: doc.accentColor,
    themeMode: doc.themeMode,
    contactPhone: doc.contactPhone ?? null,
    contactEmail: doc.contactEmail ?? null,
    address: doc.address ?? null,
  };
}

/** Fetch the single settings document, creating it with defaults if absent. */
async function getOrCreateSettingsDoc(): Promise<SettingDoc> {
  const col = await settingsCol();
  const existing = await col.findOne({});
  if (existing) return existing;

  const now = new Date();
  const doc: SettingDoc = {
    _id: new ObjectId(),
    ...DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

// ------------------------------------------------------------------
// Settings CRUD
// ------------------------------------------------------------------
export async function getSettings(): Promise<SettingsData> {
  const doc = await getOrCreateSettingsDoc();
  return mapSettings(doc);
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsData> {
  const current = await getOrCreateSettingsDoc();

  const $set: Partial<SettingDoc> = { updatedAt: new Date() };
  if (input.siteName !== undefined) $set.siteName = input.siteName;
  if (input.logoUrl !== undefined) $set.logoUrl = input.logoUrl;
  if (input.primaryColor !== undefined) $set.primaryColor = input.primaryColor;
  if (input.secondaryColor !== undefined) $set.secondaryColor = input.secondaryColor;
  if (input.accentColor !== undefined) $set.accentColor = input.accentColor;
  if (input.themeMode !== undefined) $set.themeMode = input.themeMode;
  if (input.contactPhone !== undefined) $set.contactPhone = input.contactPhone;
  if (input.contactEmail !== undefined) $set.contactEmail = input.contactEmail;
  if (input.address !== undefined) $set.address = input.address;

  const col = await settingsCol();
  const updated = await col.findOneAndUpdate(
    { _id: current._id },
    { $set },
    { returnDocument: "after" },
  );

  return mapSettings(updated ?? { ...current, ...$set });
}
