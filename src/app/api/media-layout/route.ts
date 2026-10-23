import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

// Dev-only endpoint for the media layout editor (/about?node=…&edit=1):
// pressing Enter there saves the card's media positions into
// src/data/media-layout.json, which the showcase reads.
const FILE = path.join(process.cwd(), "src/data/media-layout.json");

type Place = {
  top?: string;
  left?: string;
  width?: string;
  rotate?: number;
  z?: number;
};

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as {
    nodeId?: unknown;
    items?: unknown;
  } | null;
  if (
    !body ||
    typeof body.nodeId !== "string" ||
    !/^[a-z0-9-]+$/.test(body.nodeId) ||
    typeof body.items !== "object" ||
    body.items === null
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  let data: Record<string, Record<string, Place>> = {};
  try {
    data = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    // first save: start a new file
  }
  data[body.nodeId] = body.items as Record<string, Place>;
  await fs.writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  return NextResponse.json({ ok: true, file: "src/data/media-layout.json" });
}
