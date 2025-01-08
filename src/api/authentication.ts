import { Request, Response } from "express";
import { signInWithEmailAndPassword } from "firebase/auth";
import { handleError } from "../utils/response";
import { auth } from "../firebase/firebase";

export default {
  requiresAuthentication: false, 
  post: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      // Return the token
      res.json({ token });
    } catch (error) {
      console.error("Authentication error:", error);
      handleError(res, error); // You can customize this for better error handling
    }
  },
};
