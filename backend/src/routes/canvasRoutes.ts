import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveUserId } from "../lib/resolveUserId";
import { syncCanvasForUser } from "../services/canvasSyncService";

const canvasRoutes = Router();

type ConnectBody = {
  canvasBaseUrl?: unknown;
  accessToken?: unknown;
};

// POST /api/canvas/sync
// Triggers a full Canvas sync for the authenticated user.
// Uses stored credentials if body fields are omitted.
canvasRoutes.post("/sync", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user identifier." });
    }

    const body = req.body as ConnectBody;

    // Prefer credentials from the request body; fall back to stored ones.
    let canvasBaseUrl =
      typeof body.canvasBaseUrl === "string" ? body.canvasBaseUrl : null;
    let accessToken =
      typeof body.accessToken === "string" ? body.accessToken : null;

    if (!canvasBaseUrl || !accessToken) {
      const prefs = await prisma.preferences.findUnique({
        where: { userId },
        select: { canvasBaseUrl: true, canvasToken: true },
      });

      canvasBaseUrl = canvasBaseUrl ?? prefs?.canvasBaseUrl ?? null;
      accessToken = accessToken ?? prefs?.canvasToken ?? null;
    }

    if (!canvasBaseUrl || !accessToken) {
      return res.status(400).json({
        error:
          "Canvas credentials not found. Provide canvasBaseUrl and accessToken, or connect first.",
      });
    }

    const result = await syncCanvasForUser(userId, canvasBaseUrl, accessToken);

    return res.status(200).json(result);
  } catch (error) {
    console.error("[canvas.sync] failed:", error);
    return next(error);
  }
});

export default canvasRoutes;
