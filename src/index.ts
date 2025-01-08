import express, { Application } from "express";
import fs from "fs";
import path from "path";
import { verifyAuthToken } from "./middleware/auth"; // Import middleware
import "dotenv/config";

const app: Application = express();
app.use(express.json());

const apiFolder = path.join(__dirname, "api");

// Automatically load all API routes
fs.readdirSync(apiFolder).forEach((file) => {
  const route = require(path.join(apiFolder, file)).default;
  const endpoint = `/${file.replace(".ts", "")}`; // Base endpoint (e.g., /user, /token)

  if (typeof route === "object") {
    Object.entries(route).forEach(([method, handler]) => {
      if (typeof handler === "function") {
        // Determine if authentication is required
        const requiresAuth = route.requiresAuthentication || false;
        const middleware = requiresAuth ? [verifyAuthToken] : [];

        // Register base route (e.g., /user)
        app[method as keyof Application](endpoint, ...middleware, handler);

        // Register parameterized route (e.g., /user/:id)
        app[method as keyof Application](`${endpoint}/:id`, ...middleware, handler);
      }
    });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
