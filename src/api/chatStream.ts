import { Request, Response } from "express";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../firebase/firebase";
import { handleError } from "../utils/response";

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

      const unsubscribe = onValue(
        messagesRef,
        (snapshot) => {
          const messages: any[] = [];
          snapshot.forEach((child) => {
            messages.push({ id: child.key, ...child.val() });
          });

          res.write(`data: ${JSON.stringify(messages.reverse())}\n\n`);
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
