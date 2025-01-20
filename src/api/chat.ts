import { Request, Response } from "express";
import { ref, push, query, orderByKey, endBefore, limitToLast, get } from "firebase/database";
import { fsdb, rtdb } from "../firebase/firebase";
import { handleError, sendResponse } from "../utils/response";
import { AppError } from "../utils/AppError";
import { currentUser } from "../utils/currentUser";
import { doc, getDoc } from "firebase/firestore";

export default {
  requiresAuthentication: true,

  // GET: Fetch the 20 most recent messages and enable pagination
  get: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { lastMessageId } = req.query;
      const user = await currentUser(req);

      if (!id) {
        return res.status(400).json({ error: "Token address is required." });
      }

      const messagesRef = ref(rtdb, `chatrooms/${id}/messages`);
      const messagesQuery = lastMessageId
        ? query(messagesRef, orderByKey(), endBefore(lastMessageId as string), limitToLast(20))
        : query(messagesRef, orderByKey(), limitToLast(20));

      const messagesSnapshot = await get(messagesQuery);
      const userPromises: Promise<any>[] = [];

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
  
        userPromises.push(userPromise);
      });
      
      const enrichedMessages = await Promise.all(userPromises);

      sendResponse(res, enrichedMessages);
    } catch (error) {
      handleError(res, error);
    }
  },

  // POST: Add a new message to the chat
  post: async (req: Request, res: Response) => {
    try {
      const { tokenAddress, content } = req.body;

      if (!tokenAddress || !content) {
        throw new AppError("Token address, user ID, and message content are required.", 400);
      }

      const messagesRef = ref(rtdb, `chatrooms/${tokenAddress}/messages`);

      const user = await currentUser(req);
      // Add the new message
      const newMessage = {
        uid: user.uid,
        content,
        timestamp: Date.now(),
      };

      const messageRef = await push(messagesRef, newMessage);

      sendResponse(res, {
        message: "Message added successfully.",
        messageId: messageRef.key,
        messageData: newMessage,
      });
    } catch (error) {
      handleError(res, error);
    }
  },
};
