import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;

  try {
    const run = await getRun(runId);
    const [status, workflowName, createdAt, startedAt, completedAt] = await Promise.all([
      run.status,
      run.workflowName,
      run.createdAt,
      run.startedAt,
      run.completedAt,
    ]);

    return NextResponse.json({
      ok: true,
      runId,
      status,
      workflowName,
      createdAt: createdAt.toISOString(),
      startedAt: startedAt?.toISOString() ?? null,
      completedAt: completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RUN_NOT_FOUND",
          message: error instanceof Error ? error.message : `Run ${runId} not found`,
        },
      },
      { status: 404 }
    );
  }
}
