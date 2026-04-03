import { prisma } from "../lib/prisma";

// Canvas API types (subset of what the API returns)
interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
}

interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  workflow_state: string;
  published: boolean;
}

const COURSE_COLORS = ["study", "accent", "assignment", "personal"] as const;

async function canvasFetch<T>(
  baseUrl: string,
  token: string,
  path: string,
): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `${baseUrl}/api/v1${path}`;

  // Canvas paginates via Link headers — follow until exhausted.
  while (url) {
    const response: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Canvas API error ${response.status} for ${url}`);
    }

    const page = (await response.json()) as T[];
    results.push(...page);

    // Parse the Link header for the next page URL.
    const link: string = response.headers.get("Link") ?? "";
    const next: string | null =
      link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return results;
}

export interface CanvasSyncResult {
  coursesUpserted: number;
  assignmentsUpserted: number;
}

export async function syncCanvasForUser(
  userId: string,
  canvasBaseUrl: string,
  accessToken: string,
): Promise<CanvasSyncResult> {
  // Normalise base URL — strip trailing slash.
  const base = canvasBaseUrl.replace(/\/$/, "");

  // 1. Fetch active student courses + Canvas favourite IDs in parallel.
  const [allCourses, favoriteCourses] = await Promise.all([
    canvasFetch<CanvasCourse>(
      base,
      accessToken,
      "/courses?enrollment_state=active&enrollment_type=student&per_page=50",
    ),
    canvasFetch<{ id: number }>(
      base,
      accessToken,
      "/users/self/favorites/courses?per_page=50",
    ).catch(() => [] as { id: number }[]),
  ]);

  const activeCourses = allCourses.filter(
    (c) => c.workflow_state === "available",
  );

  const favoriteCanvasIds = new Set(favoriteCourses.map((c) => String(c.id)));

  if (activeCourses.length === 0) {
    return { coursesUpserted: 0, assignmentsUpserted: 0 };
  }

  // 2. On first Canvas sync, clear out any demo/manual data so the user
  //    starts fresh with real Canvas content.
  const existingCanvasCount = await prisma.course.count({
    where: { userId, source: "canvas" },
  });

  if (existingCanvasCount === 0) {
    await prisma.timeBlock.deleteMany({ where: { userId, source: "manual" } });
    await prisma.assignment.deleteMany({ where: { userId, source: "manual" } });
    await prisma.course.deleteMany({ where: { userId, source: "manual" } });
  }

  // 3. Upsert courses — match by externalId so re-syncs are idempotent.
  const courseIdMap = new Map<number, string>(); // canvasId → our DB id

  await Promise.all(
    activeCourses.map(async (course, index) => {
      const externalId = String(course.id);
      const color = COURSE_COLORS[index % COURSE_COLORS.length]!;

      const existing = await prisma.course.findFirst({
        where: { userId, source: "canvas", externalId },
        select: { id: true },
      });

      const isFavorite = favoriteCanvasIds.has(externalId);

      if (existing) {
        await prisma.course.update({
          where: { id: existing.id },
          data: { name: course.name, code: course.course_code, isFavorite },
        });
        courseIdMap.set(course.id, existing.id);
      } else {
        const created = await prisma.course.create({
          data: {
            userId,
            name: course.name,
            code: course.course_code,
            color,
            source: "canvas",
            externalId,
            isFavorite,
          },
          select: { id: true },
        });
        courseIdMap.set(course.id, created.id);
      }
    }),
  );

  // 4. Fetch and upsert assignments for each course.
  let assignmentsUpserted = 0;

  await Promise.all(
    activeCourses.map(async (course) => {
      const ourCourseId = courseIdMap.get(course.id);
      if (!ourCourseId) return;

      let assignments: CanvasAssignment[];
      try {
        assignments = await canvasFetch<CanvasAssignment>(
          base,
          accessToken,
          `/courses/${course.id}/assignments?bucket=upcoming&per_page=100`,
        );
      } catch {
        // If one course fails (e.g. access denied), skip it rather than
        // failing the whole sync.
        console.warn(
          `[Canvas] Skipping assignments for course ${course.id}: fetch failed`,
        );
        return;
      }

      const published = assignments.filter(
        (a) => a.published && a.due_at !== null,
      );

      await Promise.all(
        published.map(async (assignment) => {
          const externalId = String(assignment.id);
          const deadline = new Date(assignment.due_at!);

          const existing = await prisma.assignment.findFirst({
            where: { userId, source: "canvas", externalId },
            select: { id: true },
          });

          if (existing) {
            await prisma.assignment.update({
              where: { id: existing.id },
              data: { name: assignment.name, deadline, courseId: ourCourseId },
            });
          } else {
            await prisma.assignment.create({
              data: {
                userId,
                courseId: ourCourseId,
                name: assignment.name,
                deadline,
                difficulty: null,
                completed: false,
                source: "canvas",
                externalId,
              },
            });
          }

          assignmentsUpserted++;
        }),
      );
    }),
  );

  // 5. Persist the Canvas credentials on the user's preferences so future
  //    syncs don't need them re-entered.
  await prisma.preferences.update({
    where: { userId },
    data: { canvasToken: accessToken, canvasBaseUrl: base },
  });

  return { coursesUpserted: activeCourses.length, assignmentsUpserted };
}
