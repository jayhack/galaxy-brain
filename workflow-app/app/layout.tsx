import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "galaxy-brain solver workflow",
  description: "Workflow API for running galaxy-brain eval solvers in Vercel Sandbox.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
