import { Response } from "express";
import { adminAuth } from "../firebase/firebase";
import { IGetUserAuthInfoRequest } from "./response";

export const currentUser = async (req: IGetUserAuthInfoRequest): Promise<any> => {

    let jwtToken;
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      jwtToken = authHeader.split(" ")[1];
    }
    else if(req.query.jwt) {
      jwtToken = req.query.jwt as string;
    }

    // Verify the Firebase ID token using the Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(jwtToken as string);
    
    return decodedToken;
}