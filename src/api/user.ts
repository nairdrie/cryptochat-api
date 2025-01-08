import { Request, Response } from "express";
import { handleError, IGetUserAuthInfoRequest } from "../utils/response";
import { adminAuth, fsdb } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { AppError } from "../utils/AppError";

export default {
  requiresAuthentication: true, 
  get: async (req: IGetUserAuthInfoRequest, res: Response) => {
    try {
      // Get the Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid token." });
      }

      const token = authHeader.split(" ")[1];
      // Verify the Firebase ID token using the Admin SDK
      const decodedToken = await adminAuth.verifyIdToken(token);
      // Return user information
      console.log("Decoded token:", decodedToken);
      // request the associate user in firestore
      // Fetch token info from Firestore
      const userDoc = doc(fsdb, "users", decodedToken.uid);
      const userSnapshot = await getDoc(userDoc);

      if (!userSnapshot.exists()) {
        throw new AppError(`User with uid "${decodedToken.uid}" not found.`, 404);
      }

      const userData = userSnapshot.data();
      res.json({
        uid: decodedToken.uid,
        email: decodedToken.email,
        username: userData.username || "Anonymous",
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      handleError(res, error);
    }
  },
};
