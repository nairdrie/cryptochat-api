import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { IGetUserAuthInfoRequest } from "../utils/response";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

export const verifyAuthToken = async (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction): Promise<void> => {
  let jwtToken: string | undefined;
  if(req.headers.authorization) {
    jwtToken = req.headers.authorization.split("Bearer ")[1];
  } else if(req.query.jwt) {
    jwtToken = req.query.jwt as string;
  } else {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!jwtToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(jwtToken);
    (req).user = decodedToken;
    next();
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
