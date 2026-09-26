import { useEffect, useState } from "react";

//these r the react -query hooks which r used to fetch data from backend and cache it in react-query cache
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  clearWorkspaceCache,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceStats,
  listWorkspaces,
  updateWorkspace,
} from "../api/workspace.api";

import { queryKeys } from "../api/queryKeys";
import { useWorkspaceStore } from "../stores/workspace.store";
import { useAuth } from "../auth/AuthProvider";

export default function WorkspacePage() {

  const { signOut } = useAuth();
  //query client is used to invalidate the cache after a mutation is done so that the data is refetched from the backend and the UI is updated with the latest data
  const queryClient = useQueryClient();

  const selectedWorkspaceId = useWorkspaceStore(
    (state) => state.selectedWorkspaceId,
  );

  const setSelectedWorkspaceId = useWorkspaceStore(
    (state) => state.setSelectedWorkspaceId,
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState(false);

  // workspacequery is list of all workspace
  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: listWorkspaces,
  });

  const workspaces = workspacesQuery.data ?? [];

  //by default select the first workspace in the list if no workspace is selected and there are workspaces available. This is to avoid having no workspace selected when there are workspaces available.
  useEffect(() => {
    if (
      !selectedWorkspaceId &&
      workspaces.length > 0
    ) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [
    selectedWorkspaceId,
    workspaces,
    setSelectedWorkspaceId,
  ]);

  const selectedWorkspace =
    workspaces.find(
      (workspace) =>
        workspace.id === selectedWorkspaceId,
    ) ?? null;

    //useQuery is used to fetch data from the backend and cache it in react-query cache. It takes a query key and a query function as arguments. The query key is used to identify the query in the cache. The query function is used to fetch the data from the backend. The enabled option is used to enable or disable the query. If the enabled option is set to false, the query will not be executed.
    // get workspace only when selectedWorkspaceId is not null. This is to avoid fetching workspace data when no workspace is selected.
    const workspaceQuery = useQuery({
    queryKey: queryKeys.workspace(selectedWorkspaceId),
    queryFn: () => getWorkspace(selectedWorkspaceId),
    //means only fetch workspace data when selectedWorkspaceId is not null. This is to avoid fetching workspace data when no workspace is selected.
    enabled: Boolean(selectedWorkspaceId),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.workspaceStats(
      selectedWorkspaceId,
    ),
    queryFn: () => getWorkspaceStats(selectedWorkspaceId),
    enabled: Boolean(selectedWorkspaceId),
  });

  //useMutation is used to perform mutations on the backend. It takes a mutation function as an argument. The mutation function is used to perform the mutation on the backend. The onSuccess option is used to perform actions after the mutation is successful. In this case, we are invalidating the cache for workspaces so that the new workspace is fetched from the backend and the UI is updated with the latest data. We are also setting the selectedWorkspaceId to the newly created workspace id and hiding the create form.
  const createMutation = useMutation({
    mutationFn: createWorkspace,
    //on success invalidate the cache for workspaces so that the new workspace is fetched from the backend and the UI is updated with the latest data. Also set the selectedWorkspaceId to the newly created workspace id and hide the create form.
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces,
      });

      setSelectedWorkspaceId(workspace.id);
      setShowCreateForm(false);
    },
  });

//updating workspace
  const updateMutation = useMutation({
    mutationFn: ({ workspaceId, data }) =>
      updateWorkspace(workspaceId, data),

    //when success invalidate the worksoace cache and the 
    //there r two cache
    //list of workspace and a worksace ->selected workspaceId
    onSuccess: async () => {
      setEditing(false);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspace(
          selectedWorkspaceId,
        ),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,

    onSuccess: async () => {
      setSelectedWorkspaceId(null);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces,
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearWorkspaceCache,
  });

  if (workspacesQuery.isLoading) {
    return <main>Loading workspaces...</main>;
  }

  if (workspacesQuery.isError) {
    return (
      <main>
        <h1>Unable to load workspaces</h1>
        <p>{workspacesQuery.error.message}</p>
        <button
          type="button"
          onClick={() => workspacesQuery.refetch()}
        >
          Try again
        </button>
      </main>
    );
  }

  async function handleCreate(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await createMutation.mutateAsync({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    });
  }

  async function handleUpdate(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await updateMutation.mutateAsync({
      workspaceId: selectedWorkspaceId,
      data: {
        name: formData.get("name"),
        description: formData.get("description"),
      },
    });
  }

  function handleDelete() {
    if (!selectedWorkspaceId) return;

    const confirmed = window.confirm(
      "Delete this workspace and all its indexed data?",
    );

    if (!confirmed) return;

    deleteMutation.mutate(selectedWorkspaceId);
  }

  function handleClearCache() {
    if (!selectedWorkspaceId) return;

    clearCacheMutation.mutate(selectedWorkspaceId);
  }

  if (workspaces.length === 0) {
    return (
      <main>
        <header>
          <h1>RAG Workspace</h1>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </header>

        <section>
          <h2>Create your first workspace</h2>

          <form onSubmit={handleCreate}>
            <label>
              Name
              <input name="name" required maxLength={50} />
            </label>

            <label>
              Description
              <textarea name="description" maxLength={200} />
            </label>

            <button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Creating..."
                : "Create workspace"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header>
        <div>
          <h1>RAG Workspace</h1>
          <p>Manage your documentation workspace.</p>
        </div>

        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>

      <section>
        <label>
          Workspace
          <select
            value={selectedWorkspaceId ?? ""}
            onChange={(event) =>
              setSelectedWorkspaceId(event.target.value)
            }
          >
            {workspaces.map((workspace) => (
              <option
                key={workspace.id}
                value={workspace.id}
              >
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
        >
          New workspace
        </button>
      </section>

      {showCreateForm && (
        <section>
          <h2>New workspace</h2>

          <form onSubmit={handleCreate}>
            <label>
              Name
              <input name="name" required maxLength={50} />
            </label>

            <label>
              Description
              <textarea name="description" maxLength={200} />
            </label>

            <button
              type="submit"
              disabled={createMutation.isPending}
            >
              Create
            </button>

            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </form>
        </section>
      )}

      {selectedWorkspace && (
        <section>
          {editing ? (
            <form onSubmit={handleUpdate}>
              <h2>Edit workspace</h2>

              <label>
                Name
                <input
                  name="name"
                  defaultValue={selectedWorkspace.name}
                  required
                  maxLength={50}
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={
                    selectedWorkspace.description ?? ""
                  }
                  maxLength={200}
                />
              </label>

              <button
                type="submit"
                disabled={updateMutation.isPending}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <h2>
                {workspaceQuery.data?.name ??
                  selectedWorkspace.name}
              </h2>

              <p>
                {workspaceQuery.data?.description ||
                  "No description added."}
              </p>

              <button
                type="button"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? "Deleting..."
                  : "Delete workspace"}
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearCacheMutation.isPending}
              >
                {clearCacheMutation.isPending
                  ? "Clearing..."
                  : "Clear semantic cache"}
              </button>
            </>
          )}
        </section>
      )}

      {statsQuery.isLoading ? (
        <p>Loading workspace statistics...</p>
      ) : statsQuery.isError ? (
        <p>{statsQuery.error.message}</p>
      ) : (
        <WorkspaceStats stats={statsQuery.data} />
      )}
    </main>
  );
}

function WorkspaceStats({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <section>
      <h2>Workspace statistics</h2>

      <dl>
        <div>
          <dt>Total sources</dt>
          <dd>{stats.sources?.total ?? 0}</dd>
        </div>

        <div>
          <dt>Completed sources</dt>
          <dd>{stats.sources?.done ?? 0}</dd>
        </div>

        <div>
          <dt>Pending sources</dt>
          <dd>{stats.sources?.pending ?? 0}</dd>
        </div>

        <div>
          <dt>Failed sources</dt>
          <dd>{stats.sources?.failed ?? 0}</dd>
        </div>

        <div>
          <dt>Total pages</dt>
          <dd>{stats.totalPages ?? 0}</dd>
        </div>

        <div>
          <dt>Total chunks</dt>
          <dd>{stats.totalChunks ?? 0}</dd>
        </div>

        <div>
          <dt>Total messages</dt>
          <dd>{stats.totalMessages ?? 0}</dd>
        </div>

        <div>
          <dt>Total FAQs</dt>
          <dd>{stats.totalFAQs ?? 0}</dd>
        </div>
      </dl>
    </section>
  );
}