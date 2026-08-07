// src/lib/settings-service.ts
// Data service for site settings with Prisma + in-memory fallback.

import type { Setting } from "@prisma/client";
import { getPrismaClient } from "@/server/prisma";

// ------------------------------------------------------------------
// In-memory store
// ------------------------------------------------------------------
let memSettings: Setting | null = null;

function getDefaultSettings(): Setting {
  return {
    id: "mem_settings_1",
    siteName: "Premium Menu",
    logoUrl: null,
    primaryColor: "#2f6b4f",
    secondaryColor: "#8b233d",
    accentColor: "#f4e3b2",
    themeMode: "system",
    contactPhone: null,
    contactEmail: "hello@premiummenu.test",
    address: "تهران، خیابان ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ------------------------------------------------------------------
// Prisma availability check
// ------------------------------------------------------------------
let prismaAvailable: boolean | null = null;

async function isPrismaAvailable(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    prismaAvailable = true;
  } catch {
    prismaAvailable = false;
  }
  return prismaAvailable;
}

// ------------------------------------------------------------------
// Settings CRUD
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

export async function getSettings(): Promise<SettingsData> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          siteName: "Premium Menu",
          contactEmail: "hello@premiummenu.test",
        },
      });
    }
    return {
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      themeMode: settings.themeMode,
      contactPhone: settings.contactPhone,
      contactEmail: settings.contactEmail,
      address: settings.address,
    };
  }

  if (!memSettings) memSettings = getDefaultSettings();
  return {
    siteName: memSettings.siteName,
    logoUrl: memSettings.logoUrl,
    primaryColor: memSettings.primaryColor,
    secondaryColor: memSettings.secondaryColor,
    accentColor: memSettings.accentColor,
    themeMode: memSettings.themeMode,
    contactPhone: memSettings.contactPhone,
    contactEmail: memSettings.contactEmail,
    address: memSettings.address,
  };
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsData> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          siteName: input.siteName ?? "Premium Menu",
          logoUrl: input.logoUrl ?? null,
          primaryColor: input.primaryColor ?? "#2f6b4f",
          secondaryColor: input.secondaryColor ?? "#8b233d",
          accentColor: input.accentColor ?? "#f4e3b2",
          themeMode: input.themeMode ?? "system",
          contactPhone: input.contactPhone ?? null,
          contactEmail: input.contactEmail ?? null,
          address: input.address ?? null,
        },
      });
    } else {
      const updateData: Record<string, unknown> = {};
      if (input.siteName !== undefined) updateData.siteName = input.siteName;
      if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
      if (input.primaryColor !== undefined) updateData.primaryColor = input.primaryColor;
      if (input.secondaryColor !== undefined) updateData.secondaryColor = input.secondaryColor;
      if (input.accentColor !== undefined) updateData.accentColor = input.accentColor;
      if (input.themeMode !== undefined) updateData.themeMode = input.themeMode;
      if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone;
      if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
      if (input.address !== undefined) updateData.address = input.address;

      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return {
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      themeMode: settings.themeMode,
      contactPhone: settings.contactPhone,
      contactEmail: settings.contactEmail,
      address: settings.address,
    };
  }

  if (!memSettings) memSettings = getDefaultSettings();
  if (input.siteName !== undefined) memSettings.siteName = input.siteName;
  if (input.logoUrl !== undefined) memSettings.logoUrl = input.logoUrl;
  if (input.primaryColor !== undefined) memSettings.primaryColor = input.primaryColor;
  if (input.secondaryColor !== undefined) memSettings.secondaryColor = input.secondaryColor;
  if (input.accentColor !== undefined) memSettings.accentColor = input.accentColor;
  if (input.themeMode !== undefined) memSettings.themeMode = input.themeMode;
  if (input.contactPhone !== undefined) memSettings.contactPhone = input.contactPhone;
  if (input.contactEmail !== undefined) memSettings.contactEmail = input.contactEmail;
  if (input.address !== undefined) memSettings.address = input.address;
  memSettings.updatedAt = new Date();

  return {
    siteName: memSettings.siteName,
    logoUrl: memSettings.logoUrl,
    primaryColor: memSettings.primaryColor,
    secondaryColor: memSettings.secondaryColor,
    accentColor: memSettings.accentColor,
    themeMode: memSettings.themeMode,
    contactPhone: memSettings.contactPhone,
    contactEmail: memSettings.contactEmail,
    address: memSettings.address,
  };
}
