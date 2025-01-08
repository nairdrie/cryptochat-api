import { Response } from "express";
import { Request } from "express"
import admin from "firebase-admin";
import { AppError } from "./AppError";
import { FirebaseError } from "firebase/app"; // Import FirebaseError type if using TypeScript


export interface IGetUserAuthInfoRequest extends Request {
  user?: admin.auth.DecodedIdToken
}

export const sendResponse = (res: Response, data: unknown) => {
  res.status(200).json(data);
};

export const handleError = (res: Response, error: unknown) => {
  if (error instanceof AppError) {
    // Handle custom application errors
    console.error(`[AppError] ${error.message}`);
    return res.status(error.statusCode).json({ error: error.message });
  }

  if (error instanceof FirebaseError) {
    // Handle Firebase-specific errors
    console.error(`[FirebaseError] ${error.message}`);
    if (error.code === "permission-denied") {
      return res.status(403).json({ error: "Permission denied: You do not have access to this resource." });
    }

    if(error.code === "auth/invalid-credential") {
      return res.status(401).json({ error: "Wrong email or password." });
    }
    // Catch other Firebase errors if needed
    return res.status(400).json({ error: error.message });
  }

  // Handle unexpected errors
  console.error("[Unexpected Error]", error);
  res.status(500).json({ error: "Internal server error" });
};
