import { NextResponse } from "next/server";
import { getRunEvents, isRunStoreConfigured } from "@/lib/run-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "500");
  const afterParam = url.searchParams.get("after");
  const afterId = afterParam ? Number(afterParam) : undefined;

  try {
    const result = await getRunEvents(id, {
      solutionSlug: optionalParam(url, "solution"),
      limit: Number.isFinite(limit) ? limit : 500,
      afterId: afterId != null && Number.isFinite(afterId) ? afterId : undefined,
    });

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RUN_NOT_FOUND",
            message: `No tracked run found for ${id}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RUN_EVENTS_LOOKUP_FAILED",
          message: error instanceof Error ? error.message : "Run event lookup failed",
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
