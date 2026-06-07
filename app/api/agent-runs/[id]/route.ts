import { NextResponse } from "next/server";
import { getRunWithJobs, isRunStoreConfigured } from "@/lib/run-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  try {
    const result = await getRunWithJobs(id);
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
          code: "RUN_LOOKUP_FAILED",
          message: error instanceof Error ? error.message : "Run lookup failed",
        },
      },
      { status: 500 }
    );
  }
}
