// src/store/table-store.ts
// Zustand store برای مدیریت state میزها در admin panel

import { create } from "zustand";
import type { Table } from "@/types";

interface TableState {
  tables: Table[];
  isLoading: boolean;
  error: string | null;

  // actions
  setTables: (tables: Table[]) => void;
  addTable: (table: Table) => void;
  updateTable: (table: Table) => void;
  removeTable: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTableStore = create<TableState>((set) => ({
  tables: [],
  isLoading: false,
  error: null,

  setTables: (tables) => set({ tables }),

  addTable: (table) =>
    set((state) => ({ tables: [table, ...state.tables] })),

  updateTable: (updated) =>
    set((state) => ({
      tables: state.tables.map((t) => (t.id === updated.id ? updated : t)),
    })),

  removeTable: (id) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
