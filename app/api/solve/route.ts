import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { normalizeSolveRequest } from "@/lib/solve-request";
import { attachWorkflowRunId, createPendingRunRecord } from "@/lib/run-store";
import { solveEvalWorkflow } from "@/workflows/solve-eval";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input;
  try {
    const body = await request.json();
    input = normalizeSolveRequest(body);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_SOLVE_REQUEST",
          message: error instanceof Error ? error.message : "Invalid request body",
        },
      },
      { status: 400 }
    );
  }

  const trackingId = randomUUID();
  const trackedInput = { ...input, trackingId };

  await createPendingRunRecord(trackedInput, trackingId);
  const run = await start(solveEvalWorkflow, [trackedInput]);
  await attachWorkflowRunId(trackingId, run.runId);

  return NextResponse.json({
    ok: true,
    runId: run.runId,
    trackingId,
    dryRun: input.dryRun,
    eval: input.evalSlug,
    configs: input.configs.map(({ harness, model, solutionSlug }) => ({
      harness,
      model,
      solutionSlug,
    })),
  });
}
