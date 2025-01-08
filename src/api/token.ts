import { Request, Response } from "express";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, query, limitToLast, get, set } from "firebase/database";
import { rtdb, fsdb } from "../firebase/firebase";
import { handleError, IGetUserAuthInfoRequest, sendResponse } from "../utils/response";
import { AppError } from "../utils/AppError";
import { FirebaseError } from "firebase/app";
import { getTokenMetadata } from "../utils/SolanaRPC";
import { token } from "@metaplex-foundation/js";

const fetchTokenData = async (tokenAddress: string) => {
  try {
    // Fetch token info from Firestore
    const tokenDoc = doc(fsdb, "tokens", tokenAddress);
    const tokenSnapshot = await getDoc(tokenDoc);

    if (!tokenSnapshot.exists()) {
      throw new AppError(`Token with address "${tokenAddress}" not found.`, 404);
    }

    const tokenData = tokenSnapshot.data();

    // Fetch the last few messages from Realtime Database
    const messagesRef = ref(rtdb, `chatrooms/${tokenAddress}/messages`);
    const messagesQuery = query(messagesRef, limitToLast(10));

    let messagesSnapshot;
    try {
      messagesSnapshot = await get(messagesQuery);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "permission-denied") {
        throw new AppError("Permission denied: Unable to fetch chat messages.", 403);
      }
      throw error; // Re-throw unexpected errors
    }

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
          };
        }
        return { ...messageWithId, username: "Unknown User" };
      });

      userPromises.push(userPromise);
    });

    const enrichedMessages = await Promise.all(userPromises);

    return {
      meta: {
        ticker: tokenData?.ticker,
        name: tokenData?.name,
        address: tokenAddress,
        logoUrl: tokenData?.logoUrl,
      },
      messages: enrichedMessages,
    };
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      throw new AppError("Permission denied: Unable to fetch token data.", 403);
    }
    throw error; // Re-throw unexpected errors
  }
};

export default {
  requiresAuthentication: true, 
  // GET: Fetch token info and last few messages
  get: async (req: IGetUserAuthInfoRequest, res: Response) => {
    try {
      const { id } = req.params;

      const tokenAddress = id;
      
      if (!tokenAddress) {
        return res.status(400).json({ error: "Token address is required." });
      }

      const result = await fetchTokenData(tokenAddress);

      sendResponse(res, result);
    } catch (error) {
      handleError(res, error);
    }
  },

  // POST: Create a new token and its chatroom
  post: async (req: Request, res: Response) => {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({ error: "Token address, name, and ticker are required." });
      }

      const tokenMetadata = await getTokenMetadata(address);

      if(!tokenMetadata) {
        throw new AppError("Token metadata not found.", 404);
      }
      const { name, ticker, logoUrl } = tokenMetadata;
      
      // Create the token in Firestore
      const tokenDoc = doc(fsdb, "tokens", address);
      await setDoc(tokenDoc, { name, ticker, logoUrl });

      // Initialize the chatroom in Realtime Database
      const chatroomRef = ref(rtdb, `chatrooms/${address}`);
      await set(chatroomRef, {
        messages: {}, // Initialize an empty messages object
      });

      // Respond with the new token data
      const result = await fetchTokenData(address);

      sendResponse(res, result);
    } catch (error) {
      handleError(res, error);
    }
  },
};
