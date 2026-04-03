import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveUserId } from "../lib/resolveUserId";
import { syncCanvasForUser } from "../services/canvasSyncService";
import { syncMaterialsForCourse } from "../services/canvasMaterialsService";

const canvasRoutes = Router();

async function getStoredCredentials(userId: string) {
  const prefs = await prisma.preferences.findUnique({
    where: { userId },
    select: { canvasBaseUrl: true, canvasToken: true },
  });
  return {
    canvasBaseUrl: prefs?.canvasBaseUrl ?? null,
    accessToken: prefs?.canvasToken ?? null,
  };
}

// POST /api/canvas/sync
canvasRoutes.post("/sync", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing user identifier." });

    const body = req.body as Partial<{ canvasBaseUrl: string; accessToken: string }>;

    let canvasBaseUrl = typeof body.canvasBaseUrl === "string" ? body.canvasBaseUrl : null;
    let accessToken = typeof body.accessToken === "string" ? body.accessToken : null;

    if (!canvasBaseUrl || !accessToken) {
      const stored = await getStoredCredentials(userId);
      canvasBaseUrl = canvasBaseUrl ?? stored.canvasBaseUrl;
      accessToken = accessToken ?? stored.accessToken;
    }

    if (!canvasBaseUrl || !accessToken) {
      return res.status(400).json({
        error: "Canvas credentials not found. Connect first.",
      });
    }

    const result = await syncCanvasForUser(userId, canvasBaseUrl, accessToken);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[canvas.sync] failed:", error);
    return next(error);
  }
});

// POST /api/canvas/sync-materials/:courseId
canvasRoutes.post("/sync-materials/:courseId", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing user identifier." });

    const { courseId } = req.params;
    const stored = await getStoredCredentials(userId);

    if (!stored.canvasBaseUrl || !stored.accessToken) {
      return res.status(400).json({ error: "Canvas not connected." });
    }

    const result = await syncMaterialsForCourse(
      userId,
      courseId,
      stored.canvasBaseUrl,
      stored.accessToken,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("[canvas.sync-materials] failed:", error);
    return next(error);
  }
});

// PATCH /api/canvas/favorites/:courseId
// Toggles favourite state in both shedulAI DB and Canvas.
canvasRoutes.patch("/favorites/:courseId", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing user identifier." });

    const { courseId } = req.params;
    const body = req.body as Partial<{ isFavorite: unknown }>;

    if (typeof body.isFavorite !== "boolean") {
      return res.status(400).json({ error: "isFavorite must be a boolean." });
    }

    // Verify ownership.
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId },
      select: { id: true, externalId: true, isFavorite: true },
    });

    if (!course) return res.status(404).json({ error: "Course not found." });

    // Update our DB.
    await prisma.course.update({
      where: { id: courseId },
      data: { isFavorite: body.isFavorite },
    });

    // Sync to Canvas if we have credentials and an external ID.
    if (course.externalId) {
      const stored = await getStoredCredentials(userId);
      if (stored.canvasBaseUrl && stored.accessToken) {
        const base = stored.canvasBaseUrl.replace(/\/$/, "");
        const method = body.isFavorite ? "POST" : "DELETE";
        const url = `${base}/api/v1/users/self/favorites/courses/${course.externalId}`;
        fetch(url, {
          method,
          headers: { Authorization: `Bearer ${stored.accessToken}` },
        }).catch((err) =>
          console.warn("[Canvas] Favourite sync failed:", err),
        );
      }
    }

    return res.status(200).json({ isFavorite: body.isFavorite });
  } catch (error) {
    return next(error);
  }
});

export default canvasRoutes;
