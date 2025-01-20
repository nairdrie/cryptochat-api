import { Response } from "express";
import { adminAuth } from "../firebase/firebase";
import { IGetUserAuthInfoRequest } from "./response";

export const currentUser = async (req: IGetUserAuthInfoRequest): Promise<any> => {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    // Verify the Firebase ID token using the Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return decodedToken;
}