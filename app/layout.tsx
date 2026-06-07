import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { fontVariables } from "./fonts";
import { getEvals, repoUrls } from "@/lib/content";
import { Monogram } from "@/components/globule";
import { MobileDrawer } from "@/components/mobile-drawer";
import { SiteSidebar } from "@/components/site-sidebar";
import { HashRedirect } from "@/components/hash-redirect";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";
import { Button } from "@/components/ui/button";

const siteTitle = "galaxy-brain - agent evals";
const siteDescription =
  "A collection of agent evals. Browse evals, harnesses, models, and outcomes.";
const socialDescription =
  "A chromatic quarterly of agent evals - each eval is a prompt, each solution one harness/model pair's attempt at it.";
const favicon =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22gc%22%20cx%3D%2234%25%22%20cy%3D%2230%25%22%20r%3D%2275%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ffffff%22%2F%3E%3Cstop%20offset%3D%2212%25%22%20stop-color%3D%22%23bdeef5%22%2F%3E%3Cstop%20offset%3D%2252%25%22%20stop-color%3D%22%232dc4d8%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23126974%22%2F%3E%3C%2FradialGradient%3E%3CradialGradient%20id%3D%22gs%22%20cx%3D%2234%25%22%20cy%3D%2230%25%22%20r%3D%2275%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ffffff%22%2F%3E%3Cstop%20offset%3D%2212%25%22%20stop-color%3D%22%23faf0bf%22%2F%3E%3Cstop%20offset%3D%2252%25%22%20stop-color%3D%22%23f2d24a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%238e6a0c%22%2F%3E%3C%2FradialGradient%3E%3CradialGradient%20id%3D%22gm%22%20cx%3D%2234%25%22%20cy%3D%2230%25%22%20r%3D%2275%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ffffff%22%2F%3E%3Cstop%20offset%3D%2212%25%22%20stop-color%3D%22%23f6c4dc%22%2F%3E%3Cstop%20offset%3D%2252%25%22%20stop-color%3D%22%23e04691%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%236e1a45%22%2F%3E%3C%2FradialGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23edebe4%22%2F%3E%3Ccircle%20cx%3D%2237%22%20cy%3D%2240%22%20r%3D%2226%22%20fill%3D%22url(%23gc)%22%20stroke%3D%22%230a0908%22%20stroke-opacity%3D%220.1%22%2F%3E%3Ccircle%20cx%3D%2263%22%20cy%3D%2240%22%20r%3D%2226%22%20fill%3D%22url(%23gs)%22%20stroke%3D%22%230a0908%22%20stroke-opacity%3D%220.1%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2262%22%20r%3D%2228%22%20fill%3D%22url(%23gm)%22%20stroke%3D%22%230a0908%22%20stroke-opacity%3D%220.12%22%2F%3E%3C%2Fsvg%3E";
const initialPageStyle = {
  backgroundColor: "#edebe4",
  color: "#0a0908",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://galaxy-brain.vercel.app"
  ),
  title: siteTitle,
  description: siteDescription,
  icons: { icon: [{ url: favicon, type: "image/svg+xml" }] },
  openGraph: {
    type: "website",
    siteName: "galaxy-brain",
    title: siteTitle,
    description: socialDescription,
    url: "https://galaxy-brain.vercel.app/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "galaxy-brain - a chromatic quarterly of agent evals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: socialDescription,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const evals = getEvals().map((ev) => ({
    slug: ev.slug,
    title: ev.title,
    count: ev.solutions.length,
  }));
  const evalTitles = Object.fromEntries(evals.map((e) => [e.slug, e.title]));
  const repo = repoUrls().repo;

  return (
    <html lang="en" className={fontVariables} style={initialPageStyle}>
      <body
        className="paper min-h-screen font-sans text-foreground antialiased"
        style={initialPageStyle}
      >
        <HashRedirect />
        <div className="min-h-screen lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="paper-soft sticky top-0 hidden h-screen flex-col border-r border-ink lg:flex">
            <SiteSidebar evals={evals} />
          </aside>

          <div className="flex min-h-screen flex-col">
            <header className="paper-soft sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink px-4 sm:px-6 lg:px-10">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <MobileDrawer evals={evals} />
                <Link
                  href="/"
                  className="flex min-w-0 items-center gap-2"
                  aria-label="galaxy-brain - home"
                >
                  <Monogram modifier="logo-monogram--sm" />
                  <span className="logo-wordmark truncate">galaxy-brain</span>
                </Link>
              </div>
              <HeaderBreadcrumb
                evalTitles={evalTitles}
                className="hidden min-w-0 lg:flex"
              />
              <Button asChild variant="paper" size="xs">
                <a href={repo} target="_blank" rel="noopener noreferrer">
                  Source -&gt;
                </a>
              </Button>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
              {children}
            </main>

            <footer className="mt-4 border-t border-ink">
              <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-10">
                <div className="flex items-center gap-2.5">
                  <Monogram modifier="logo-monogram--sm" />
                  <span className="stamp-block">
                    galaxy-brain
                    <br />
                    agent x evals - next/vercel
                  </span>
                </div>
                <p className="mono-label opacity-60">
                  <a
                    className="g-link"
                    href={repo}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    view source on github -&gt;
                  </a>
                </p>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
