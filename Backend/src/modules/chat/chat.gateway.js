import {
  saveMessage,
  getAllMessages,
  deleteWorkspaceMessage,
} from "./chat.service.js";
import { runRagPipeline } from "./rag.service.js";

export async function registerChatGateway(socketInstance) {
  //it listens the event based on this message event and callback function
  socketInstance.on("connection", (socket) => {
    console.log("Clinet Connected :"`${socket.user.id}`);

    //u joined the socket and join the particular room
    socket.on("workspace:join", (workspaceId) => {
      (socket.join(workspaceId),
        console.log(`User ${socket.user.id} joined workspace ${workspaceId}`));
    });

    socket.on("workspace:leave", (workspaceId) => {
      socket.leave(workspaceId);
    });

    //inside that connection only all operation will be perform ->means connection active(socket) then only perform opn
    socket.on("chat:message", async ({ question, workspaceId }) => {
      if (!workspaceId || !question || !question.trim()) {
        socket.emit("chat:error", { message: "Invalid question or Workspace" });
      }

      //first check whether workspace even exist he is chatting
      // and also status
      const workspace = await prisma.workspace.findUnique({
        where: {
          id: workspaceId,
          userId: socket.user.id,
        },
        include: {
          sources: {
            where: { status: "DONE" },
          },
        },
      });

      if (!workspace) {
        socket.emit("chat:error", {
          message: "Workspace not found.. Yeh dil Bandeya",
        });
      }

      if (workspace.sources.length === 0) {
        socket.emit("chat:error", {
          message:
            "Bro No indexed sources found in this workspace. Atleast add a url and wait for indexing to complete",
        });
        return;
      }

      console.log(`Chat: ${question} in workspace`);

      //tell frontend streaming is started
      socket.emit("chat:start");

      //save message first then start ur rag pipeline and falana dulana
      await saveMessage({
        workspaceId,
        role: "USER",
        content: question.trim(),
      });

      let finalFullAnswer = "";
      let finalCitations = [];
      try {
        console.log("Starting Rag Pipeline");
        await runRagPipeline({
          question: question.trim,
          workspaceId,

          //fires before streaming starts.sneds citation and contradiction to user
          onMetadata: (metadata) => {
            finalCitations =
              //the metadata sended like whether contradiction,citation,confident emit it

              socket.emit("chat:metadata", {
                citations: metadata.citations,
                hasContradiction: metadata.hasContradiction,
                contradictions: metadata.contradictions,
                confident: metadata.confident,
                reason: metadata.reason,
              });
          },

          onToken: (answer) => {
            finalFullAnswer += answer;
            socket.emit("chat:token", { token });
          },

          onDone: async (completeAnswer) => {
            //save the llm modeled response
            await saveMessage({
              role: "ASSISTANT",
              workspaceId,
              content: completeAnswer,
              sources: completeAnswer,
            });

            socket.emit("chat:done", {
              answer: completeAnswer,
              citations: finalCitations,
            });

            console.log(
              "Chat complete and answer savved to db. On done operation execited succesffuly",
            );
          },

          onError: (error) => {
            console.error("RAG PIPELINE ERROR: ", error.message);
            socket.emit("chat:error", {
              message:
                "Something went wrong while generating the answer.Please try again",
            });
          },
        });
      } catch (error) {
        console.error("Chat gateway error:", error.message);
        socket.emit("chat:error", {
          message: "An error occurred. Please try again.",
        });
      }
    });

    socket.on("chat:history", async ({ workspaceId }) => {
      try {
        const messages = await getAllMessages(workspaceId, socket.user.id);
        socket.emit("chat:history:load", { messages });
      } catch (error) {
        console.error(
          "Failed to retrieve all the messages of this Workspace",
          error.message,
        );
      }
    });

    socket.on("chat:clear", async ({ workspaceId }) => {
      console.log(`Deleting whole workspace chat for ${workspaceId}`);
      await deleteWorkspaceMessage(workspaceId, socket.user.id);
      console.log(`Chat cleared for workspace ${workspaceId}`);
    });

    socket.on("disconnet", () => {
      console.log(`Client disconnected: ${socket.user.id}`);
    });
  });
}

//why onToken is no async and why onDone is async as operation is done
