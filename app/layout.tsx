import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { fontVariables } from "./fonts";
import { getEvals, repoUrls } from "@/lib/content";
import { Monogram } from "@/components/globule";
import { MobileDrawer } from "@/components/mobile-drawer";
import { SiteSidebar } from "@/components/site-sidebar";
import { HashRedirect } from "@/components/hash-redirect";
import { Button } from "@/components/ui/button";

const siteTitle = "galaxy-brain - agent evals";
const siteDescription =
  "A collection of agent evals. Browse evals, harnesses, models, and outcomes.";
const socialDescription =
  "A chromatic quarterly of agent evals - each eval is a prompt, each solution one harness/model pair's attempt at it.";
const favicon =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='34%25'%20cy='30%25'%20r='75%25'%3E%3Cstop%20offset='0%25'%20stop-color='%23ffffff'/%3E%3Cstop%20offset='12%25'%20stop-color='%23bdeef5'/%3E%3Cstop%20offset='52%25'%20stop-color='%232DC4D8'/%3E%3Cstop%20offset='100%25'%20stop-color='%23126974'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect%20width='100'%20height='100'%20fill='%23F2EAD0'/%3E%3Ccircle%20cx='50'%20cy='52'%20r='33'%20fill='url(%23g)'/%3E%3C/svg%3E";

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
  const repo = repoUrls().repo;

  return (
    <html lang="en" className={fontVariables}>
      <body className="paper min-h-screen font-sans text-foreground antialiased">
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
              <span className="mono-label hidden opacity-75 lg:inline">
                Agent&nbsp;Evals
              </span>
              <Button asChild variant="paper" size="xs">
                <a href={repo} target="_blank" rel="noopener noreferrer">
                  Source -&gt;
                </a>
              </Button>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
              {children}
            </main>

            <footer className="mt-4 border-t border-ink">
              <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-10">
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
