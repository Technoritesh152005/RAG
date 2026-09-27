import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./socket";
import { useSocketConnected } from "./WorkspaceSocketProvider";
import { queryKeys } from "../api/queryKeys";

export function useSourceStatus(workspaceId) {
  const queryClient = useQueryClient();
  const connected = useSocketConnected();

  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();

    function handleSourceStatus(update) {
      let sourceFound = false;

      queryClient.setQueryData(
        queryKeys.sources(workspaceId),
        (sources) => {
          if (!sources) return sources;

          const updatedSources = sources.map((source) => {
            if (source.id !== update.sourceId) return source;

            sourceFound = true;
            return {
              ...source,
              status: update.status,
              pageCount: update.pageCount ?? source.pageCount,
              chunkCount: update.chunkCount ?? source.chunkCount,
              error: update.error ?? null,
            };
          });

          return updatedSources;
        },
      );

      // The status event may arrive before the new source has loaded into the list.
      if (!sourceFound) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.sources(workspaceId),
        });
      }

      if (["DONE", "FAILED"].includes(update.status)) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaceStats(workspaceId),
        });
      }
    }

    socket.on("source:status", handleSourceStatus);

    return () => {
      socket.off("source:status", handleSourceStatus);
    };
  }, [workspaceId, queryClient]);

  return { connected };
}