import type { Request } from "express";

export function resolveUserId(req: Request) {
  const headerUserId = req.header("x-user-id");
  const queryUserId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;

  return headerUserId ?? queryUserId ?? process.env.DEV_USER_ID;
}
