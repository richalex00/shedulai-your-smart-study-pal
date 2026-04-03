import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveUserId } from "../lib/resolveUserId";

const assignmentsRoutes = Router();

assignmentsRoutes.patch("/:id", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({
        error: "Missing user identifier. Provide x-user-id header.",
      });
    }

    const { id } = req.params;
    const body = req.body as Partial<{ completed: unknown }>;

    if (typeof body.completed !== "boolean") {
      return res.status(400).json({ error: "completed must be a boolean" });
    }

    // Verify the assignment belongs to this user before updating.
    const existing = await prisma.assignment.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: { completed: body.completed },
      select: { id: true, completed: true },
    });

    return res.status(200).json(assignment);
  } catch (error) {
    return next(error);
  }
});

export default assignmentsRoutes;
