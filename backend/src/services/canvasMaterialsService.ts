import AdmZip from "adm-zip";
import mammoth from "mammoth";
// pdf-parse ships as a CJS default export; use require() to avoid ESM interop issues.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import { prisma } from "../lib/prisma";

const MAX_CONTENT_CHARS = 50_000; // per material item
const CANVAS_FETCH_TIMEOUT_MS = 15_000;

// ─── Canvas API helpers ───────────────────────────────────────────────────────

async function canvasGet(
  baseUrl: string,
  token: string,
  path: string,
): Promise<unknown[]> {
  const results: unknown[] = [];
  let url: string | null = `${baseUrl}/api/v1${path}`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(CANVAS_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) break;

    const page = (await res.json()) as unknown[];
    results.push(...page);

    const link: string = res.headers.get("Link") ?? "";
    const next: string | null =
      link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return results;
}

async function canvasDownload(
  url: string,
  token: string,
): Promise<Buffer | null> {
  try {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(CANVAS_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// ─── Text extraction ──────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function truncate(text: string): string {
  return text.length > MAX_CONTENT_CHARS
    ? text.slice(0, MAX_CONTENT_CHARS) + "\n[truncated]"
    : text;
}

async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string | null> {
  try {
    if (
      mimeType === "application/pdf" ||
      fileName.toLowerCase().endsWith(".pdf")
    ) {
      const result = await pdfParse(buffer);
      return truncate(result.text.trim());
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return truncate(result.value.trim());
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileName.toLowerCase().endsWith(".pptx")
    ) {
      return truncate(extractPptxText(buffer));
    }

    if (mimeType.startsWith("text/")) {
      return truncate(buffer.toString("utf8"));
    }

    return null; // binary/image — skip
  } catch (err) {
    console.warn(`[Materials] Text extraction failed for ${fileName}:`, err);
    return null;
  }
}

function extractPptxText(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const texts: string[] = [];

    for (const entry of entries) {
      if (
        entry.entryName.startsWith("ppt/slides/slide") &&
        entry.entryName.endsWith(".xml")
      ) {
        const xml = entry.getData().toString("utf8");
        // Extract text runs from DrawingML
        const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean)
          .join(" ");
        if (slideText) texts.push(slideText);
      }
    }

    return texts.join("\n\n");
  } catch {
    return "";
  }
}

// ─── Canvas item types ────────────────────────────────────────────────────────

interface CanvasFile {
  id: number;
  display_name: string;
  filename: string;
  "content-type": string;
  url: string;
  updated_at: string;
  size: number;
}

interface CanvasAnnouncement {
  id: number;
  title: string;
  message: string;
  posted_at: string;
}

interface CanvasPage {
  page_id: number;
  title: string;
  body: string | null;
  updated_at: string;
  url: string;
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface MaterialSyncResult {
  synced: number;
  skipped: number;
  failed: number;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function syncMaterialsForCourse(
  userId: string,
  courseId: string, // our DB id
  canvasBaseUrl: string,
  accessToken: string,
): Promise<MaterialSyncResult> {
  const base = canvasBaseUrl.replace(/\/$/, "");

  // Resolve Canvas external course ID.
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    select: { externalId: true },
  });

  if (!course?.externalId) {
    throw new Error("Course not found or has no Canvas ID");
  }

  const canvasCourseId = course.externalId;
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  async function upsertMaterial(opts: {
    externalId: string;
    type: "file" | "announcement" | "page";
    name: string;
    contentText: string | null;
    mimeType?: string;
    canvasUpdatedAt?: Date;
  }) {
    try {
      await prisma.courseMaterial.upsert({
        where: { courseId_externalId: { courseId, externalId: opts.externalId } },
        update: {
          name: opts.name,
          contentText: opts.contentText,
          mimeType: opts.mimeType ?? null,
          canvasUpdatedAt: opts.canvasUpdatedAt ?? null,
        },
        create: {
          userId,
          courseId,
          type: opts.type,
          name: opts.name,
          contentText: opts.contentText,
          mimeType: opts.mimeType ?? null,
          externalId: opts.externalId,
          canvasUpdatedAt: opts.canvasUpdatedAt ?? null,
        },
      });
      synced++;
    } catch (err) {
      console.warn("[Materials] upsert failed:", opts.name, err);
      failed++;
    }
  }

  // 1. Announcements
  const announcements = (await canvasGet(
    base,
    accessToken,
    `/courses/${canvasCourseId}/discussion_topics?only_announcements=true&per_page=50`,
  )) as CanvasAnnouncement[];

  for (const a of announcements) {
    const text = stripHtml(a.message ?? "");
    await upsertMaterial({
      externalId: `announcement-${a.id}`,
      type: "announcement",
      name: a.title,
      contentText: truncate(text),
      canvasUpdatedAt: new Date(a.posted_at),
    });
  }

  // 2. Pages
  const pages = (await canvasGet(
    base,
    accessToken,
    `/courses/${canvasCourseId}/pages?per_page=50`,
  )) as CanvasPage[];

  for (const p of pages) {
    // Fetch full body if not included
    let body = p.body;
    if (!body) {
      try {
        const pageDetail = (await canvasGet(
          base,
          accessToken,
          `/courses/${canvasCourseId}/pages/${p.url}`,
        )) as unknown as CanvasPage;
        body = (pageDetail as unknown as CanvasPage).body ?? null;
      } catch {
        body = null;
      }
    }
    const text = body ? stripHtml(body) : null;
    await upsertMaterial({
      externalId: `page-${p.page_id}`,
      type: "page",
      name: p.title,
      contentText: text ? truncate(text) : null,
      canvasUpdatedAt: new Date(p.updated_at),
    });
  }

  // 3. Files
  const files = (await canvasGet(
    base,
    accessToken,
    `/courses/${canvasCourseId}/files?per_page=100`,
  )) as CanvasFile[];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.log(`[Materials] Skipping large file: ${file.display_name} (${Math.round(file.size / 1024)}KB)`);
      skipped++;
      continue;
    }

    const buffer = await canvasDownload(file.url, accessToken);
    if (!buffer) {
      skipped++;
      continue;
    }

    const mimeType = file["content-type"] ?? "";
    const contentText = await extractText(buffer, mimeType, file.display_name);

    await upsertMaterial({
      externalId: `file-${file.id}`,
      type: "file",
      name: file.display_name,
      contentText,
      mimeType,
      canvasUpdatedAt: new Date(file.updated_at),
    });
  }

  return { synced, skipped, failed };
}
