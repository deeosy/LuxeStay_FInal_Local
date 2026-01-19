import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  initialized: false,
  setAuthState: (payload) =>
    set({
      user: payload?.user || null,
      session: payload?.session || null,
      initialized: true,
    }),
  clearAuthState: () =>
    set({
      user: null,
      session: null,
      initialized: true,
    }),
}));

export default useAuthStore;

