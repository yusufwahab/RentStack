import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { apiRouter, publicRoutes } from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use(express.json());

  app.get("/health", (req, res) => res.json({ status: "ok", env: env.nodeEnv }));

  app.use("/api", apiRouter);
  app.use("/public", publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
