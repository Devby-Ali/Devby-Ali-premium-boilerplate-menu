// src/lib/settings-service.ts
import { ObjectId } from "mongodb";

import {
  DEFAULT_RESERVATION_SLOTS,
  settingsCol,
  type SettingDoc,
} from "@/server/db";
import type { ReservationSlotConfig } from "@/types";

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
  reservationSlots: DEFAULT_RESERVATION_SLOTS,
} as const;

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
  reservationSlots: ReservationSlotConfig[];
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
  reservationSlots?: ReservationSlotConfig[];
}

function normalizeSlots(slots: ReservationSlotConfig[] | undefined): ReservationSlotConfig[] {
  if (!slots || slots.length === 0) return [...DEFAULT_RESERVATION_SLOTS];
  return slots.map((slot) => ({
    startHour: slot.startHour,
    endHour: slot.endHour,
    isActive: slot.isActive !== false,
  }));
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
    reservationSlots: normalizeSlots(doc.reservationSlots),
  };
}

async function getOrCreateSettingsDoc(): Promise<SettingDoc> {
  const col = await settingsCol();
  const existing = await col.findOne({});
  if (existing) {
    if (!existing.reservationSlots || existing.reservationSlots.length === 0) {
      await col.updateOne(
        { _id: existing._id },
        { $set: { reservationSlots: DEFAULT_RESERVATION_SLOTS, updatedAt: new Date() } },
      );
      return { ...existing, reservationSlots: [...DEFAULT_RESERVATION_SLOTS] };
    }
    return existing;
  }

  const now = new Date();
  const doc: SettingDoc = {
    _id: new ObjectId(),
    ...DEFAULT_SETTINGS,
    reservationSlots: [...DEFAULT_RESERVATION_SLOTS],
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

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
  if (input.reservationSlots !== undefined) {
    $set.reservationSlots = normalizeSlots(input.reservationSlots);
  }

  const col = await settingsCol();
  const updated = await col.findOneAndUpdate(
    { _id: current._id },
    { $set },
    { returnDocument: "after" },
  );

  return mapSettings(updated ?? { ...current, ...$set });
}
