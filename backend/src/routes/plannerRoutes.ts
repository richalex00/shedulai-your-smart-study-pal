import { Router } from "express";
import { getPlannerContextForUser } from "../services/plannerContextService";
import { resolveUserId } from "../lib/resolveUserId";

const plannerRoutes = Router();

plannerRoutes.get("/context", async (req, res, next) => {
  try {
    // MVP placeholder until auth is wired in: support x-user-id, ?userId=, or DEV_USER_ID fallback.
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({
        error:
          "Missing user identifier. Provide x-user-id header, userId query param, or set DEV_USER_ID.",
      });
    }

    const context = await getPlannerContextForUser(userId);

    return res.status(200).json(context);
  } catch (error) {
    return next(error);
  }
});

export default plannerRoutes;
