import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listWorkspaces } from "../api/workspace.api";
import { useWorkspaceStore } from "../stores/workspace.store";
import { useAuth } from "../auth/AuthProvider";

export default function WorkspacePage() {
  const { user, signOut } = useAuth();

  const selectedWorkspaceId = useWorkspaceStore(
    (state) => state.selectedWorkspaceId,
  );

  const setSelectedWorkspaceId = useWorkspaceStore(
    (state) => state.setSelectedWorkspaceId,
  );

  const {
    data: workspaces = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: listWorkspaces,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [
    selectedWorkspaceId,
    workspaces,
    setSelectedWorkspaceId,
  ]);

  if (isLoading) {
    return <main>Loading workspaces...</main>;
  }

  if (isError) {
    return (
      <main>
        <h1>Unable to load workspaces</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  if (workspaces.length === 0) {
    return (
      <main>
        <header>
          <h1>No workspaces yet</h1>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </header>

        <p>Create your first workspace to begin indexing documentation.</p>
      </main>
    );
  }

  const selectedWorkspace =
    workspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    ) || workspaces[0];

  return (
    <main>
      <header>
        <h1>{selectedWorkspace.name}</h1>

        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>

      <label>
        Workspace
        <select
          value={selectedWorkspace.id}
          onChange={(event) =>
            setSelectedWorkspaceId(event.target.value)
          }
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </label>

      <section>
        <h2>Workspace overview</h2>
        <p>
          Sources: {selectedWorkspace.sources?.length ?? 0}
        </p>
        <p>
          Messages: {selectedWorkspace._count?.messages ?? 0}
        </p>
      </section>
    </main>
  );
}