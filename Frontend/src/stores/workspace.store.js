import { create } from "zustand";

export const useWorkspaceStore = create((set) => ({
  selectedWorkspaceId: null,

  setSelectedWorkspaceId: (workspaceId) => {
    set({ selectedWorkspaceId: workspaceId });
  },

  clearSelectedWorkspace: () => {
    set({ selectedWorkspaceId: null });
  },
}));

//this bassically keeps shared state of which workspave is being selected