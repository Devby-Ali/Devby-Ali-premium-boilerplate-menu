import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { UserSession } from "@/types";

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setUser: (user: UserSession | null) => void;
  logout: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      logout: () => set({ user: null, isAuthenticated: false }),
      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "premium-menu-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // ⛔ دیگر از onRehydrateStorage استفاده نکنید
      // onRehydrateStorage: () => (state) => {
      //   state?.markHydrated();
      // },
    },
  ),
);
