import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEV_USER_ID =
  process.env.DEV_USER_ID ?? "11111111-1111-1111-1111-111111111111";
const DEV_USER_EMAIL = "dev@shedulai.local";

function dayOffset(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {
      id: DEV_USER_ID,
      name: "Dev User",
    },
    create: {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: "Dev User",
    },
  });

  await prisma.preferences.upsert({
    where: { userId: DEV_USER_ID },
    update: {
      onboardingComplete: true,
      studyHours: "morning",
      aiMode: "assisted",
      noWorkAfter: 21,
      personalActivities: true,
    },
    create: {
      userId: DEV_USER_ID,
      onboardingComplete: true,
      studyHours: "morning",
      aiMode: "assisted",
      noWorkAfter: 21,
      personalActivities: true,
    },
  });

  await prisma.assignment.deleteMany({ where: { userId: DEV_USER_ID } });
  await prisma.timeBlock.deleteMany({ where: { userId: DEV_USER_ID } });
  await prisma.course.deleteMany({ where: { userId: DEV_USER_ID } });

  const [courseMl, courseDs, courseStats, coursePsy] = await Promise.all([
    prisma.course.create({
      data: {
        userId: DEV_USER_ID,
        name: "Machine Learning",
        code: "CS401",
        color: "study",
        source: "manual",
      },
    }),
    prisma.course.create({
      data: {
        userId: DEV_USER_ID,
        name: "Data Structures",
        code: "CS201",
        color: "accent",
        source: "manual",
      },
    }),
    prisma.course.create({
      data: {
        userId: DEV_USER_ID,
        name: "Statistics",
        code: "MATH301",
        color: "assignment",
        source: "manual",
      },
    }),
    prisma.course.create({
      data: {
        userId: DEV_USER_ID,
        name: "Psychology",
        code: "PSY101",
        color: "personal",
        source: "manual",
      },
    }),
  ]);

  await prisma.assignment.createMany({
    data: [
      {
        userId: DEV_USER_ID,
        courseId: courseMl.id,
        name: "Neural Network Lab Report",
        deadline: dayOffset(2),
        difficulty: "hard",
        completed: false,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        courseId: courseDs.id,
        name: "Binary Tree Implementation",
        deadline: dayOffset(4),
        difficulty: "medium",
        completed: false,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        courseId: courseStats.id,
        name: "Probability Problem Set 5",
        deadline: dayOffset(1),
        difficulty: "easy",
        completed: true,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        courseId: coursePsy.id,
        name: "Research Essay Draft",
        deadline: dayOffset(7),
        difficulty: "hard",
        completed: false,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        courseId: courseMl.id,
        name: "Read Chapter 8",
        deadline: dayOffset(3),
        difficulty: "easy",
        completed: false,
        source: "manual",
      },
    ],
  });

  await prisma.timeBlock.createMany({
    data: [
      {
        userId: DEV_USER_ID,
        type: "study",
        title: "ML Study Session",
        courseId: courseMl.id,
        date: dayOffset(0),
        startHour: 9,
        endHour: 11,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        type: "personal",
        title: "Gym",
        date: dayOffset(0),
        startHour: 12,
        endHour: 13,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        type: "assignment",
        title: "Prob Set 5",
        courseId: courseStats.id,
        date: dayOffset(0),
        startHour: 14,
        endHour: 16,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        type: "study",
        title: "Data Structures Review",
        courseId: courseDs.id,
        date: dayOffset(1),
        startHour: 10,
        endHour: 12,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        type: "personal",
        title: "Free Time",
        date: dayOffset(1),
        startHour: 17,
        endHour: 19,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        type: "study",
        title: "Statistics Lecture Notes",
        courseId: courseStats.id,
        date: dayOffset(2),
        startHour: 9,
        endHour: 10,
        source: "manual",
      },
      {
        userId: DEV_USER_ID,
        type: "assignment",
        title: "Neural Net Report",
        courseId: courseMl.id,
        date: dayOffset(2),
        startHour: 13,
        endHour: 16,
        source: "manual",
      },
    ],
  });

  console.log(`Seed completed for DEV_USER_ID=${DEV_USER_ID}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
