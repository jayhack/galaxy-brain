import { ImageResponse } from "next/og";

export const alt = "galaxy-brain - a chromatic quarterly of agent evals";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#edebe4",
          color: "#0a0908",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 34, letterSpacing: 8, textTransform: "uppercase" }}>
            Agent Evals
          </div>
          <div style={{ fontSize: 104, fontWeight: 900, letterSpacing: -6 }}>
            galaxy-brain
          </div>
          <div style={{ maxWidth: 720, fontSize: 34, lineHeight: 1.2 }}>
            A chromatic quarterly of prompts, harnesses, models, and outcomes.
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", width: 320, height: 320 }}>
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 20,
              width: 180,
              height: 180,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 32% 28%, #ffffff 0%, #bdeef5 20%, #2dc4d8 52%, #126974 100%)",
              boxShadow: "inset -26px -34px 46px rgba(0,0,0,.42), 0 18px 42px rgba(10,9,8,.24)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 48,
              width: 128,
              height: 128,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 32% 28%, #ffffff 0%, #f6b7d6 22%, #e04691 52%, #6e1a45 100%)",
              boxShadow: "inset -20px -26px 36px rgba(0,0,0,.42), 0 14px 34px rgba(10,9,8,.24)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 64,
              bottom: 0,
              width: 146,
              height: 146,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 32% 28%, #ffffff 0%, #caf5b0 22%, #82e647 54%, #316e1e 100%)",
              boxShadow: "inset -20px -26px 36px rgba(0,0,0,.42), 0 14px 34px rgba(10,9,8,.24)",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
