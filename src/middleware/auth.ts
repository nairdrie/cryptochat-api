import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { IGetUserAuthInfoRequest } from "../utils/response";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

export const verifyAuthToken = async (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction): Promise<void> => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req).user = decodedToken;
    next();
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
