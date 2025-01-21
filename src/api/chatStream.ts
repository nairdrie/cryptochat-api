import { Request, Response } from "express";
import { ref, onValue } from "firebase/database";
import { fsdb, rtdb } from "../firebase/firebase";
import { handleError } from "../utils/response";
import { doc, getDoc } from "firebase/firestore";
import { currentUser } from "../utils/currentUser";

export default {
  requiresAuthentication: true,

  // GET: Stream new messages in real-time
  get: async (req: Request, res: Response) => {
    try {
      const { tokenAddress } = req.query;

      if (!tokenAddress) {
        return res.status(400).json({ error: "Token address is required." });
      }

      const messagesRef = ref(rtdb, `chatrooms/${tokenAddress}/messages`);

      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const user = await currentUser(req);

      const unsubscribe = onValue(
        messagesRef,
        async (messagesSnapshot) => {
          const messages: Promise<any>[] = [];
          messagesSnapshot.forEach((child) => {
            const message = child.val();
            const messageWithId = { id: child.key, ...message };
      
            // Fetch the user's username from Firestore
            const userDoc = doc(fsdb, "users", message.uid);
            const userPromise = getDoc(userDoc).then((userSnapshot) => {
              if (userSnapshot.exists()) {
                return {
                  ...messageWithId,
                  username: userSnapshot.data()?.username || "Unknown User",
                  self: user.uid === message.uid,
                };
              }
              return { ...messageWithId, username: "Unknown User" };
            });
            messages.push(userPromise);
          });

          const enrichedMessages = await Promise.all(messages);

          res.write(`data: ${JSON.stringify(enrichedMessages)}\n\n`);
        },
        (error) => {
          res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        }
      );

      req.on("close", () => {
        unsubscribe();
        res.end();
      });
    } catch (error) {
      handleError(res, error);
    }
  },
};
