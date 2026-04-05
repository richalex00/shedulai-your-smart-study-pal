import AdmZip from "adm-zip";
import mammoth from "mammoth";
// pdf-parse ships as a CJS default export; use require() to avoid ESM interop issues.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import { prisma } from "../lib/prisma";

const MAX_CONTENT_CHARS = 50_000;
const CANVAS_FETCH_TIMEOUT_MS = 20_000;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ─── Canvas API helpers ───────────────────────────────────────────────────────

async function canvasGetAll(
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

    if (!res.ok) {
      console.warn(`[Materials] GET ${url} → ${res.status}`);
      break;
    }

    const page = (await res.json()) as unknown[];
    if (!Array.isArray(page)) break;
    results.push(...page);

    const link: string = res.headers.get("Link") ?? "";
    const next: string | null =
      link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return results;
}

async function canvasGetOne<T>(
  baseUrl: string,
  token: string,
  path: string,
): Promise<T | null> {
  try {
    const res: Response = await fetch(`${baseUrl}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(CANVAS_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function canvasDownload(
  url: string,
  token: string,
): Promise<Buffer | null> {
  try {
    // Use manual redirect so we can strip the Authorization header before
    // following redirects to S3 pre-signed URLs. S3 rejects requests that
    // carry both a pre-signed token in the URL and an Authorization header.
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
      signal: AbortSignal.timeout(CANVAS_FETCH_TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400) {
      const redirectUrl = res.headers.get("location");
      if (!redirectUrl) return null;
      const s3Res = await fetch(redirectUrl, {
        signal: AbortSignal.timeout(CANVAS_FETCH_TIMEOUT_MS),
        // No Authorization header — S3 pre-signed URL is self-authenticating
      });
      if (!s3Res.ok) {
        console.warn(`[Materials] S3 download failed: ${s3Res.status} ${redirectUrl}`);
        return null;
      }
      return Buffer.from(await s3Res.arrayBuffer());
    }

    if (!res.ok) {
      console.warn(`[Materials] Download failed: ${res.status} ${url}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.warn(`[Materials] Download error for ${url}:`, err);
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

async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string | null> {
  try {
    const name = fileName.toLowerCase();

    if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      const result = await pdfParse(buffer);
      return truncate(result.text.trim());
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return truncate(result.value.trim());
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      name.endsWith(".pptx")
    ) {
      return truncate(extractPptxText(buffer));
    }

    if (mimeType.startsWith("text/")) {
      return truncate(buffer.toString("utf8"));
    }

    return null;
  } catch (err) {
    console.warn(`[Materials] Text extraction failed for "${fileName}":`, err);
    return null;
  }
}

function extractPptxText(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const texts: string[] = [];

    for (const entry of zip.getEntries()) {
      if (
        entry.entryName.startsWith("ppt/slides/slide") &&
        entry.entryName.endsWith(".xml")
      ) {
        const xml = entry.getData().toString("utf8");
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

// ─── Canvas type definitions ──────────────────────────────────────────────────

interface CanvasFile {
  id: number;
  display_name: string;
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

interface CanvasModuleItem {
  id: number;
  title: string;
  type: string; // "File" | "Page" | "Assignment" | "ExternalUrl" | ...
  content_id?: number;
  page_url?: string;
  external_url?: string;
  html_url?: string;
}

interface CanvasModule {
  id: number;
  name: string;
  items?: CanvasModuleItem[];
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export interface MaterialSyncResult {
  synced: number;
  skipped: number;
  failed: number;
}

export async function syncMaterialsForCourse(
  userId: string,
  courseId: string,
  canvasBaseUrl: string,
  accessToken: string,
): Promise<MaterialSyncResult> {
  const base = canvasBaseUrl.replace(/\/$/, "");

  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    select: { externalId: true },
  });

  if (!course?.externalId) {
    throw new Error("Course not found or has no Canvas ID");
  }

  const cid = course.externalId;
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  // Track which Canvas file IDs we've already processed to avoid duplicates.
  const processedFileIds = new Set<number>();
  const processedPageUrls = new Set<string>();

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
        where: {
          courseId_externalId: { courseId, externalId: opts.externalId },
        },
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

  async function processFile(file: CanvasFile) {
    if (processedFileIds.has(file.id)) return;
    processedFileIds.add(file.id);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.log(
        `[Materials] Skipping large file: ${file.display_name} (${Math.round(file.size / 1024 / 1024)}MB)`,
      );
      skipped++;
      return;
    }

    const buffer = await canvasDownload(file.url, accessToken);
    if (!buffer) {
      skipped++;
      return;
    }

    const mimeType = file["content-type"] ?? "";
    const contentText = await extractTextFromBuffer(
      buffer,
      mimeType,
      file.display_name,
    );

    await upsertMaterial({
      externalId: `file-${file.id}`,
      type: "file",
      name: file.display_name,
      contentText,
      mimeType,
      canvasUpdatedAt: new Date(file.updated_at),
    });
  }

  async function processPage(pageUrl: string) {
    if (processedPageUrls.has(pageUrl)) return;
    processedPageUrls.add(pageUrl);

    const page = await canvasGetOne<CanvasPage>(
      base,
      accessToken,
      `/courses/${cid}/pages/${pageUrl}`,
    );
    if (!page) return;

    const text = page.body ? stripHtml(page.body) : null;
    await upsertMaterial({
      externalId: `page-${page.page_id}`,
      type: "page",
      name: page.title,
      contentText: text ? truncate(text) : null,
      canvasUpdatedAt: new Date(page.updated_at),
    });
  }

  // 1. Announcements
  console.log(`[Materials] Fetching announcements for course ${cid}…`);
  const announcements = (await canvasGetAll(
    base,
    accessToken,
    `/courses/${cid}/discussion_topics?only_announcements=true&per_page=50`,
  )) as CanvasAnnouncement[];

  for (const a of announcements) {
    await upsertMaterial({
      externalId: `announcement-${a.id}`,
      type: "announcement",
      name: a.title,
      contentText: truncate(stripHtml(a.message ?? "")),
      canvasUpdatedAt: new Date(a.posted_at),
    });
  }
  console.log(`[Materials] Announcements: ${announcements.length}`);

  // 2. Front page (course home)
  const frontPage = await canvasGetOne<CanvasPage>(
    base,
    accessToken,
    `/courses/${cid}/front_page`,
  );
  if (frontPage?.body) {
    processedPageUrls.add(frontPage.url);
    await upsertMaterial({
      externalId: `page-${frontPage.page_id}`,
      type: "page",
      name: frontPage.title,
      contentText: truncate(stripHtml(frontPage.body)),
      canvasUpdatedAt: new Date(frontPage.updated_at),
    });
  }

  // 3. Modules — the main source of lecture content ("Home" tab in Canvas)
  console.log(`[Materials] Fetching modules for course ${cid}…`);
  const modules = (await canvasGetAll(
    base,
    accessToken,
    `/courses/${cid}/modules?include[]=items&per_page=50`,
  )) as CanvasModule[];

  console.log(`[Materials] Found ${modules.length} modules`);

  for (const mod of modules) {
    const items = mod.items ?? [];

    for (const item of items) {
      if (item.type === "File" && item.content_id) {
        const file = await canvasGetOne<CanvasFile>(
          base,
          accessToken,
          `/courses/${cid}/files/${item.content_id}`,
        );
        if (file) await processFile(file);
      } else if (item.type === "Page" && item.page_url) {
        await processPage(item.page_url);
      }
    }
  }

  // 4. Supplemental: direct files listing (catches files not in any module)
  console.log(`[Materials] Fetching files listing for course ${cid}…`);
  const allFiles = (await canvasGetAll(
    base,
    accessToken,
    `/courses/${cid}/files?per_page=100`,
  )) as CanvasFile[];

  console.log(`[Materials] Direct files: ${allFiles.length}`);
  for (const file of allFiles) {
    await processFile(file); // deduped via processedFileIds
  }

  // 5. Supplemental: pages listing
  const allPageList = (await canvasGetAll(
    base,
    accessToken,
    `/courses/${cid}/pages?per_page=50`,
  )) as CanvasPage[];

  for (const p of allPageList) {
    await processPage(p.url); // deduped via processedPageUrls
  }

  console.log(
    `[Materials] Done — synced: ${synced}, skipped: ${skipped}, failed: ${failed}`,
  );

  return { synced, skipped, failed };
}
