import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveUserId } from "../lib/resolveUserId";

const coursesRoutes = Router();

// GET /api/courses/:courseId/materials
coursesRoutes.get("/:courseId/materials", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing user identifier." });

    const { courseId } = req.params;

    const course = await prisma.course.findFirst({
      where: { id: courseId, userId },
      select: { id: true },
    });
    if (!course) return res.status(404).json({ error: "Course not found." });

    const materials = await prisma.courseMaterial.findMany({
      where: { courseId },
      orderBy: [{ type: "asc" }, { canvasUpdatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        type: true,
        mimeType: true,
        canvasUpdatedAt: true,
      },
    });

    return res.status(200).json(materials);
  } catch (error) {
    return next(error);
  }
});

export default coursesRoutes;
