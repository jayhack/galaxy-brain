import { NextResponse } from "next/server";
import { isRunStoreConfigured, listRunJobs } from "@/lib/run-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isRunStoreConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RUN_STORE_NOT_CONFIGURED",
          message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
        },
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "25");

  try {
    const jobs = await listRunJobs({
      evalSlug: optionalParam(url, "eval"),
      harness: optionalParam(url, "harness"),
      model: optionalParam(url, "model"),
      status: optionalParam(url, "status"),
      q: optionalParam(url, "q"),
      limit: Number.isFinite(limit) ? limit : 25,
    });

    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RUN_SEARCH_FAILED",
          message: error instanceof Error ? error.message : "Run search failed",
        },
      },
      { status: 500 }
    );
  }
}

function optionalParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name)?.trim();
  return value || undefined;
}
