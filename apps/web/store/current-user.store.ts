'use client';

import { create } from 'zustand';
import type { User } from '@repo/types';

type CurrentUserState = {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
};

export const useCurrentUserStore = create<CurrentUserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
