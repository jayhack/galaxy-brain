export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", margin: "40px", maxWidth: "720px" }}>
      <h1>galaxy-brain solver workflow</h1>
      <p>
        POST JSON to <code>/api/solve</code> to start a Vercel Workflow run.
      </p>
    </main>
  );
}
