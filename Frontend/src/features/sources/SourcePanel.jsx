import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/queryKeys";
import {
  addSource,
  deleteSource,
  listSources,
  reindexSource,
} from "../../api/source.api";
import { useSourceStatus } from "../../realtime/useSourceStatus";

export default function sourcesPanel(workspaceId) {
  const queryClient = useQueryClient();
  const { connected } = useSourceStatus(workspaceId);
  console.log(
    `Im in source panel and this connected looks like this${connected}`,
  );

  const [url, setUrl] = useState("");

  const sourceQuery = useQuery({
    queryKey: queryKeys.sources(workspaceId),
    queryFn: () => listSources(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const addSourceMutation = useMutation({
    mutationFn: (url) => addSource( url),
    onSuccess: async () => {
      setUrl("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sources(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceStats(workspaceId),
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId) => deleteSource(workspaceId, sourceId),
    onSuccess:async()=>{
        await queryClient.invalidateQueries({
            queryKey: queryKeys.sources(workspaceId),
          });
          await queryClient.invalidateQueries({
            queryKey: queryKeys.workspaceStats(workspaceId),
          });
    }
  })

  const reindexSourceMutation = useMutation({
    mutationFn:(sourceId)=>reindexSource(workspaceId, sourceId),
    onSuccess:async()=>{
         await queryClient.invalidateQueries({
        queryKey: queryKeys.sources(workspaceId),
      });
    }
  })

  async function handleAddSource(event){
    event.preventDefault();

    const trimmed = url.trim()
    try{
        const parsedUrl = new URL(trimmed)
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported.");
      }

      if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        throw new Error(
          "Enter a documentation section URL, not only the site homepage.",
        );
      }

      //give me a promise so that i can use await to wait for the promise to resolve and then continue with the next line of code
      await addSourceMutation.mutateAsync(trimmed)
    }catch(error){
        if(error instanceof TypeError){
            //reset means reset this mutation to its initial data
            addSourceMutation.reset()
            window.alert("Invalid URL. Please enter a valid URL.");
            return 
        }
        console.error(error, 'Got this error at during adding source In workspace')
    }
  }
  function handleDelete(sourceId){
    if(!window.confirm('Delete this source and its indexed data? This action cannot be undone.')){
        return
    }   
    deleteSourceMutation.mutate(sourceId)
  }
  if (!workspaceId) {
    return <section>Select a workspace to manage its sources.</section>;
  }

  if (sourcesQuery.isLoading) {
    return <section>Loading sources...</section>;
  }

  if (sourcesQuery.isError) {
    return (
      <section>
        <h2>Unable to load sources</h2>
        <p>{sourcesQuery.error.message}</p>
        <button
          type="button"
          onClick={() => sourcesQuery.refetch()}
        >
          Try again
        </button>
      </section>
    );
  }

  const sources = sourcesQuery.data ?? [];

  return (
    <section>
      <header>
        <div>
          <h2>Sources</h2>
          <p>
            Index documentation URLs to make them available to chat.
          </p>
        </div>

        <span>
          {connected ? "Live updates connected" : "Connecting..."}
        </span>
      </header>

      <form onSubmit={handleAddSource}>
        <label htmlFor="source-url">Documentation URL</label>
        <input
          id="source-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://docs.example.com/guide"
          required
        />

        <button
          type="submit"
          disabled={addMutation.isPending}
        >
          {addMutation.isPending ? "Adding..." : "Add source"}
        </button>

        {addMutation.isError && (
          <p role="alert">{addMutation.error.message}</p>
        )}
      </form>

      {sources.length === 0 ? (
        <p>No sources yet. Add a documentation URL to begin.</p>
      ) : (
        <ul>
          {sources.map((source) => (
            <li key={source.id}>
              <div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.url}
                </a>

                <p>
                  Status: <strong>{source.status}</strong>
                  {source.pageCount != null &&
                    ` · ${source.pageCount} pages`}
                  {source.chunkCount != null &&
                    ` · ${source.chunkCount} chunks`}
                </p>

                {source.error && (
                  <p role="alert">{source.error}</p>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    reindexMutation.mutate(source.id)
                  }
                  disabled={
                    reindexMutation.isPending ||
                    source.status === "PENDING" ||
                    source.status === "SCRAPING" ||
                    source.status === "EMBEDDING"
                  }
                >
                  {reindexMutation.isPending &&
                  reindexMutation.variables === source.id
                    ? "Queueing..."
                    : "Reindex"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(source.id)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reindexMutation.isError && (
        <p role="alert">{reindexMutation.error.message}</p>
      )}

      {deleteMutation.isError && (
        <p role="alert">{deleteMutation.error.message}</p>
      )}
    </section>
  );
}
