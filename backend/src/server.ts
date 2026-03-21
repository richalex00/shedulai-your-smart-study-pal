import "dotenv/config";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import aiRoutes from "./routes/aiRoutes";
import plannerRoutes from "./routes/plannerRoutes";
import usersRoutes from "./routes/usersRoutes";
import { prisma } from "./lib/prisma";

const app = express();

const explicitOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set<string>([
  ...explicitOrigins,
  "http://localhost:8080",
  "http://localhost:8084",
  "http://localhost:8085",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-id"],
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/ai", aiRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/users", usersRoutes);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const requestLabel = `${_req.method} ${_req.originalUrl}`;
  console.error(`[API ERROR] ${requestLabel}`, error);

  const candidate = error as {
    name?: string;
    message?: string;
  };

  const isDbConfigError =
    candidate?.name === "PrismaClientInitializationError" ||
    candidate?.message?.includes("DATABASE_URL") === true;

  if (isDbConfigError) {
    return res.status(500).json({
      error:
        "Database is not configured. Set DATABASE_URL in backend/.env, then restart backend and run Prisma sync.",
    });
  }

  return res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 3000);

(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(
      `[STARTUP] Database connected: ${process.env.DATABASE_URL || "unknown"}`,
    );
  } catch (error) {
    console.error(
      "[STARTUP] Database connection failed:",
      error instanceof Error ? error.message : error,
    );
    console.error(
      "[STARTUP] Make sure DATABASE_URL is set and database is running.",
    );
    console.error(
      `[STARTUP] Current DATABASE_URL: ${process.env.DATABASE_URL}`,
    );
  }

  app.listen(port, () => {
    console.log(`Planner API running on http://localhost:${port}`);
  });
})();
