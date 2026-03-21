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

async function seedDefaultCoursesForUser(userId: string) {
  const courses = [
    { name: "Machine Learning", code: "CS401", color: "study" as const },
    { name: "Data Structures", code: "CS201", color: "accent" as const },
    { name: "Statistics", code: "MATH301", color: "assignment" as const },
    { name: "Psychology", code: "PSY101", color: "personal" as const },
  ];

  const createdCourses = await Promise.all(
    courses.map((course) =>
      prisma.course.create({
        data: {
          userId,
          name: course.name,
          code: course.code,
          color: course.color,
          source: "manual",
        },
        select: { id: true },
      }),
    ),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const defaultAssignments = [
    {
      courseId: createdCourses[0]!.id,
      name: "Neural Network Lab Report",
      deadline: addDays(today, 2),
      difficulty: "hard" as const,
    },
    {
      courseId: createdCourses[1]!.id,
      name: "Binary Tree Implementation",
      deadline: addDays(today, 4),
      difficulty: "medium" as const,
    },
    {
      courseId: createdCourses[2]!.id,
      name: "Probability Problem Set 5",
      deadline: addDays(today, 1),
      difficulty: "easy" as const,
    },
    {
      courseId: createdCourses[3]!.id,
      name: "Research Essay Draft",
      deadline: addDays(today, 7),
      difficulty: "hard" as const,
    },
    {
      courseId: createdCourses[0]!.id,
      name: "Read Chapter 8",
      deadline: addDays(today, 3),
      difficulty: "easy" as const,
    },
  ];

  await Promise.all(
    defaultAssignments.map((assignment) =>
      prisma.assignment.create({
        data: {
          userId,
          ...assignment,
          source: "manual",
        },
      }),
    ),
  );

  const defaultTimeBlocks = [
    {
      type: "study" as const,
      title: "ML Study Session",
      courseId: createdCourses[0]!.id,
      date: today,
      startHour: 9,
      endHour: 11,
    },
    {
      type: "personal" as const,
      title: "Gym",
      courseId: null as any,
      date: today,
      startHour: 12,
      endHour: 13,
    },
    {
      type: "assignment" as const,
      title: "Prob Set 5",
      courseId: createdCourses[2]!.id,
      date: today,
      startHour: 14,
      endHour: 16,
    },
    {
      type: "study" as const,
      title: "Data Structures Review",
      courseId: createdCourses[1]!.id,
      date: addDays(today, 1),
      startHour: 10,
      endHour: 12,
    },
    {
      type: "personal" as const,
      title: "Free Time",
      courseId: null as any,
      date: addDays(today, 1),
      startHour: 17,
      endHour: 19,
    },
    {
      type: "study" as const,
      title: "Statistics Lecture Notes",
      courseId: createdCourses[2]!.id,
      date: addDays(today, 2),
      startHour: 9,
      endHour: 10,
    },
    {
      type: "assignment" as const,
      title: "Neural Net Report",
      courseId: createdCourses[0]!.id,
      date: addDays(today, 2),
      startHour: 13,
      endHour: 16,
    },
  ];

  await Promise.all(
    defaultTimeBlocks.map((block) =>
      prisma.timeBlock.create({
        data: {
          userId,
          ...block,
          source: "manual",
        },
      }),
    ),
  );
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

      await seedDefaultCoursesForUser(user.id);
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
