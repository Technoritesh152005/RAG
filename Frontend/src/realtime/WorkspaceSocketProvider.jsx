import { useState, useRef, useEffect, useContext, createContext } from "react";
import { getSocket } from "./socket";
import { useWorkspaceStore } from "../stores/workspace.store";

const socketContext = createContext(null);
//create context for socket so that we can use it in any component without passing it as props
export function workspaceSocketProvider({ children }) {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const workspaceIdRef = useRef(workspaceId);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    function handleConnect() {
      setConnected(true);

      if (workspaceIdRef.current) {
        socket.emit("workspace:join", workspaceIdRef.current);
      }
    }

    function handleDisconnect() {
      setConnected(false);
    }
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, []);

  //when workspaceId changes we need to join the new workspace room and leave the old one
  useEffect(() => {
    const socket = getSocket();
    const previousWorkspaceId = workspaceIdRef.current;

    if (
      socket.connected &&
      previousWorkspaceId !== workspaceId &&
      previousWorkspaceId
    ) {
      socket.emit("workspace:leave", previousWorkspaceId);
    }
    workspaceIdRef.current = workspaceId;
    if (socket.connected && workspaceId) {
      socket.emit("workspace:join", workspaceId);
    }
  }, [workspaceId]);

  return (
    <socketContext.Provider value = {connected}>
        {children}
    </socketContext.Provider>
  )
}


export function useSocketConnected() {
  return useContext(socketContext);
}