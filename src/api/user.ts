import { Request, Response } from "express";
import { handleError, IGetUserAuthInfoRequest } from "../utils/response";
import { adminAuth, fsdb } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { AppError } from "../utils/AppError";
import { currentUser } from "../utils/currentUser";

export default {
  requiresAuthentication: true, 
  get: async (req: IGetUserAuthInfoRequest, res: Response) => {
    try {
      const user = await currentUser(req);
      const { uid, email } = user;

      const userDoc = doc(fsdb, "users", uid);
      const userSnapshot = await getDoc(userDoc);

      if (!userSnapshot.exists()) {
        throw new AppError(`User with uid "${uid}" not found.`, 404);
      }

      const userData = userSnapshot.data();
      res.json({
        uid,
        email,
        username: userData.username || "Anonymous",
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      handleError(res, error);
    }
  },
};
