import { ObjectId } from "mongodb";
import { isValidJalaaliDate, toGregorian } from "jalaali-js";

import {
  reservationsCol,
  tablesCol,
  type ReservationDoc,
} from "@/server/db";
import type { Reservation, ReservationStatus } from "@/types";

export const RESERVATION_SLOT = "20:00-22:00";
const TEHRAN_OFFSET_MINUTES = 210;

function mapReservation(
  reservation: ReservationDoc,
  tableNumber?: number,
): Reservation & { tableNumber?: number } {
  return {
    id: reservation._id.toHexString(),
    tableId: reservation.tableId.toHexString(),
    tableNumber,
    guestName: reservation.guestName,
    guestPhone: reservation.guestPhone,
    guestCount: reservation.guestCount,
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
    status: reservation.status as ReservationStatus,
    notes: reservation.notes ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

export function jalaliDateToSlot(date: string): {
  startTime: Date;
  endTime: Date;
} | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidJalaaliDate(year, month, day)) return null;

  const startGregorian = toGregorian(year, month, day);
  const nextDayGregorian = new Date(
    Date.UTC(startGregorian.gy, startGregorian.gm - 1, startGregorian.gd + 1),
  );
  const startTime = new Date(
    Date.UTC(
      startGregorian.gy,
      startGregorian.gm - 1,
      startGregorian.gd,
      20,
      0,
    ) - TEHRAN_OFFSET_MINUTES * 60_000,
  );
  const endTime = new Date(
    Date.UTC(
      nextDayGregorian.getUTCFullYear(),
      nextDayGregorian.getUTCMonth(),
      nextDayGregorian.getUTCDate(),
      20,
      0,
    ) - TEHRAN_OFFSET_MINUTES * 60_000,
  );

  return { startTime, endTime };
}

export async function isReservationSlotAvailable(
  date: string,
  guestCount: number,
): Promise<boolean> {
  const slot = jalaliDateToSlot(date);
  if (!slot || !Number.isInteger(guestCount) || guestCount < 1) return false;

  const tables = await tablesCol();
  const reservations = await reservationsCol();
  const suitableTables = await tables
    .find({ isActive: true, capacity: { $gte: guestCount } })
    .project({ _id: 1 })
    .toArray();

  if (suitableTables.length === 0) return false;

  const reservedTableIds = await reservations
    .find({
      tableId: { $in: suitableTables.map((table) => table._id) },
      status: { $in: ["pending", "confirmed"] },
      startTime: { $lt: slot.endTime },
      endTime: { $gt: slot.startTime },
    })
    .project({ tableId: 1 })
    .toArray();

  return reservedTableIds.length < suitableTables.length;
}

export async function createReservation(input: {
  date: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  notes?: string | null;
}): Promise<(Reservation & { tableNumber: number }) | null> {
  const slot = jalaliDateToSlot(input.date);
  if (!slot) return null;

  const tables = await tablesCol();
  const reservations = await reservationsCol();
  const suitableTables = await tables
    .find({ isActive: true, capacity: { $gte: input.guestCount } })
    .sort({ capacity: 1, number: 1 })
    .toArray();

  for (const table of suitableTables) {
    const conflict = await reservations.findOne({
      tableId: table._id,
      status: { $in: ["pending", "confirmed"] },
      startTime: { $lt: slot.endTime },
      endTime: { $gt: slot.startTime },
    });
    if (conflict) continue;

    const now = new Date();
    const reservation: ReservationDoc = {
      _id: new ObjectId(),
      tableId: table._id,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestCount: input.guestCount,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "pending",
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await reservations.insertOne(reservation);
    return { ...mapReservation(reservation, table.number), tableNumber: table.number };
  }

  return null;
}

export async function listReservations(): Promise<
  (Reservation & { tableNumber?: number })[]
> {
  const reservations = await reservationsCol();
  const tables = await tablesCol();
  const documents = await reservations
    .find({})
    .sort({ startTime: 1, createdAt: -1 })
    .toArray();
  const tableIds = [...new Set(documents.map((item) => item.tableId.toHexString()))].map(
    (id) => new ObjectId(id),
  );
  const tableDocuments = await tables
    .find({ _id: { $in: tableIds } })
    .project({ _id: 1, number: 1 })
    .toArray();
  const tableMap = new Map(
    tableDocuments.map((table) => [table._id.toHexString(), table.number]),
  );

  return documents.map((reservation) =>
    mapReservation(reservation, tableMap.get(reservation.tableId.toHexString())),
  );
}

export async function updateReservationStatus(
  id: string,
  status: Exclude<ReservationStatus, "pending">,
): Promise<(Reservation & { tableNumber?: number }) | null> {
  if (!ObjectId.isValid(id)) return null;
  const reservations = await reservationsCol();
  const updated = await reservations.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) return null;

  const table = await (await tablesCol()).findOne(
    { _id: updated.tableId },
    { projection: { number: 1 } },
  );
  return mapReservation(updated, table?.number);
}
