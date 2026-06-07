import { getRun } from "workflow/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;

  let run;
  try {
    run = await getRun(runId);
  } catch (error) {
    return Response.json(
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

  const encoder = new TextEncoder();
  const stream = run.getReadable().pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        const data = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      },
    })
  );

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
