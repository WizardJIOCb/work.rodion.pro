import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";

export const app = express();

app.use(
  cors({
    origin: env.APP_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "work-rodion-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (_request, response) => {
  response.json({
    name: "work.rodion.pro API",
    version: "0.1.0",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
