import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveUserId } from "../lib/resolveUserId";

const usersRoutes = Router();

type IdentifyRequestBody = {
  email?: unknown;
};

type SetOnboardingRequestBody = {
  onboardingComplete?: unknown;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

usersRoutes.post("/identify", async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "Request body must be JSON with an email field.",
      });
    }

    const body = req.body as IdentifyRequestBody;
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(emailRaw);

    if (!email || !email.includes("@") || email.length < 5) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: { id: true },
    });

    if (!existingUser) {
      await prisma.preferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    }

    return res.status(200).json({ userId: user.id });
  } catch (error) {
    console.error("[users.identify] failed", {
      body: req.body,
      error,
    });
    return next(error);
  }
});

usersRoutes.patch("/onboarding", async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({
        error:
          "Missing user identifier. Provide x-user-id header, userId query param, or set DEV_USER_ID.",
      });
    }

    const body = req.body as SetOnboardingRequestBody;
    const onboardingComplete = body.onboardingComplete;

    if (typeof onboardingComplete !== "boolean") {
      return res.status(400).json({
        error: "onboardingComplete must be a boolean",
      });
    }

    await prisma.preferences.upsert({
      where: { userId },
      update: { onboardingComplete },
      create: { userId, onboardingComplete },
    });

    return res.status(200).json({ onboardingComplete });
  } catch (error) {
    return next(error);
  }
});

export default usersRoutes;
