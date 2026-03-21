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

function maskDatabaseUrl(value: string | undefined) {
  if (!value) return "<missing>";

  // Hide credentials but keep protocol/host shape for debugging.
  return value.replace(/:\/\/([^:@]+):([^@]+)@/, "://***:***@");
}

function isUnresolvedRailwayReference(value: string | undefined) {
  if (!value) return false;
  return /^\$\{\{[^}]+\}\}$/.test(value.trim());
}

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

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] Blocked origin: ${origin}. ` +
        `Add it to CORS_ORIGIN env var (current allowed: ${[...allowedOrigins].join(", ")})`,
    );
    // Return false (not an error) so Express does not swallow the response.
    // The browser will still block the request due to missing ACAO header.
    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-user-id"],
};

// Handle all preflight OPTIONS requests before any other middleware/routes.
app.options("*", cors(corsOptions));

app.use(cors(corsOptions));

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
        "Database is not configured. Ensure DATABASE_URL is set on the backend runtime environment (e.g. Railway backend service), then redeploy.",
    });
  }

  return res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 3000);

(async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("[STARTUP] DATABASE_URL is missing in runtime environment.");
  } else if (isUnresolvedRailwayReference(databaseUrl)) {
    console.error(
      `[STARTUP] DATABASE_URL appears unresolved: ${databaseUrl}. ` +
        "This usually means Railway variable interpolation references the wrong service name.",
    );
  } else {
    console.log(
      `[STARTUP] DATABASE_URL detected: ${maskDatabaseUrl(databaseUrl)}`,
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("[STARTUP] Database connected.");
  } catch (error) {
    console.error(
      "[STARTUP] Database connection failed:",
      error instanceof Error ? error.message : error,
    );
    console.error(
      "[STARTUP] Make sure DATABASE_URL is set on the backend service and points to Railway Postgres.",
    );
    console.error(
      `[STARTUP] Current DATABASE_URL: ${maskDatabaseUrl(databaseUrl)}`,
    );
  }

  app.listen(port, () => {
    console.log(`Planner API running on http://localhost:${port}`);
  });
})();
