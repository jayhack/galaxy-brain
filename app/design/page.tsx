import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Globule, GlobuleDot, Monogram } from "@/components/globule";
import { StatusBadge } from "@/components/status-badge";
import { globulePalette, statusGlobule } from "@/lib/globules";

export const metadata: Metadata = {
  title: "Design system - galaxy-brain",
  // Internal reference page: keep it out of search indexes / sitemaps.
  robots: { index: false, follow: false },
};

/* ---------- local presentation helpers (page-only) ---------- */

function Section({
  id,
  title,
  kicker,
  children,
}: {
  id: string;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div className="mb-6 border-b border-ink pb-2">
        {kicker ? <div className="mono-label opacity-70">{kicker}</div> : null}
        <h2 className="g-display mt-1 text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return (
    <code className="border border-paper-3 bg-paper-soft px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </code>
  );
}

function Swatch({
  label,
  cssVar,
  textOnSwatch = "ink",
  utility,
}: {
  label: string;
  cssVar: string;
  textOnSwatch?: "ink" | "paper";
  utility?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-ink bg-paper">
      <div
        className="flex h-20 items-end p-2"
        style={{ backgroundColor: `var(${cssVar})` }}
      >
        <span
          className="mono-label"
          style={{
            color:
              textOnSwatch === "paper" ? "var(--paper)" : "var(--ink)",
            opacity: 0.85,
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <Spec>{cssVar}</Spec>
        {utility ? (
          <span className="font-mono text-[10px] text-ink/60">{utility}</span>
        ) : null}
      </div>
    </div>
  );
}

const surfaces = [
  { label: "paper", cssVar: "--paper", utility: "bg-paper" },
  { label: "paper-soft", cssVar: "--paper-soft", utility: "bg-paper-soft" },
  { label: "paper-3", cssVar: "--paper-3", utility: "bg-paper-3" },
  {
    label: "ink",
    cssVar: "--ink",
    utility: "bg-ink",
    text: "paper" as const,
  },
];

const chroma = [
  { name: "cyan", base: "--cyan", shade: "--cyan-d" },
  { name: "magenta", base: "--magenta", shade: "--magenta-d" },
  { name: "lime", base: "--lime", shade: "--lime-d" },
  { name: "cobalt", base: "--cobalt", shade: "--cobalt-d" },
  { name: "indigo", base: "--indigo", shade: "--indigo-d" },
  { name: "sun", base: "--sun", shade: "--sun-d" },
];

// Base colours that read on a light surface need ink text; darker ones need paper.
const baseTextOnSwatch: Record<string, "ink" | "paper"> = {
  cyan: "ink",
  magenta: "paper",
  lime: "ink",
  cobalt: "paper",
  indigo: "paper",
  sun: "ink",
};

const semanticTokens = [
  "--background",
  "--foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--destructive",
  "--border",
  "--ring",
];

const typeSpecimens = [
  {
    cls: "g-display",
    note: "Space Grotesk 600 · -0.02em · headings & display",
    sample: <span className="g-display text-3xl">Galaxy-brain display</span>,
  },
  {
    cls: "lede",
    note: "Space Grotesk 400 · intro / lede copy",
    sample: (
      <span className="lede text-xl">
        A chromatic quarterly of agent evals.
      </span>
    ),
  },
  {
    cls: "font-sans (Inter)",
    note: "body copy · 400–700",
    sample: (
      <span className="font-sans text-base">
        The quick brown fox jumps over the lazy dog.
      </span>
    ),
  },
  {
    cls: "font-mono (JetBrains Mono)",
    note: "labels, code, tabular data",
    sample: (
      <span className="font-mono text-sm">
        const globule = palette[i % 6];
      </span>
    ),
  },
  {
    cls: "mono-label",
    note: "10px · uppercase · 0.22em tracking",
    sample: <span className="mono-label">Section label</span>,
  },
  {
    cls: "masthead-caps",
    note: "uppercase · 0.3em tracking · masthead strip",
    sample: (
      <span className="masthead-caps text-[11px]">
        Agent · Evals · MMXXVI
      </span>
    ),
  },
  {
    cls: "stamp-block",
    note: "9.5px · uppercase · 0.16em · footer stamp",
    sample: <span className="stamp-block">galaxy-brain · next/vercel</span>,
  },
  {
    cls: "logo-wordmark (Archivo Black)",
    note: "logo lockup only",
    sample: <span className="logo-wordmark">galaxy-brain</span>,
  },
];

const buttonVariants = ["ink", "paper", "ghost", "cta"] as const;
const buttonSizes = ["default", "sm", "xs"] as const;
const badgeVariants = ["outline", "soft", "solid", "count"] as const;
const globulePatterns = ["", "zebra", "polka", "halftone"] as const;
const statusKeys = Object.keys(statusGlobule);

const sampleMarkdown = `# Heading one
Body copy uses **Inter** with a relaxed 1.7 line height for long-form prose.

## Heading two
- List markers tinted with \`--magenta-d\`
- Inline \`code\` sits on a paper chip
- [Links](#) carry an indigo underline

> Blockquotes get a 2px ink rule on the left.

\`\`\`ts
const g = globuleForIndex(i);
\`\`\``;

export default function DesignPage() {
  return (
    <article className="max-w-none">
      {/* ---------- intro ---------- */}
      <header className="mb-12">
        <div className="masthead-caps text-[11px] opacity-80">
          Internal &middot; Design system &middot; GLOBULE
        </div>
        <h1 className="g-display mt-2 text-4xl sm:text-5xl">Design system</h1>
        <p className="lede mt-4 max-w-3xl text-lg text-ink/85">
          The living reference for the GLOBULE theme: shadcn/ui primitives
          restyled with a warm paper/ink palette, six chromatic globule colours,
          and an editorial type stack. Use this page to view the kit and track
          changes over time.
        </p>
        <p className="mt-4 max-w-3xl text-sm text-ink/70">
          Colours are defined in <Spec>app/globals.css</Spec> (brand tokens →
          shadcn semantic tokens) and fonts in <Spec>app/fonts.ts</Spec>. This
          page is intentionally unlinked from navigation and marked{" "}
          <Spec>noindex</Spec>.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            ["Colour", "color"],
            ["Tokens", "tokens"],
            ["Typography", "type"],
            ["Globules", "globules"],
            ["Buttons", "buttons"],
            ["Badges", "badges"],
            ["Cards", "cards"],
            ["Surfaces", "surfaces"],
            ["Dividers", "dividers"],
            ["Prose", "prose"],
          ].map(([label, href]) => (
            <Button key={href} asChild variant="paper" size="xs">
              <a href={`#${href}`}>{label}</a>
            </Button>
          ))}
        </nav>
      </header>

      {/* ---------- colour ---------- */}
      <Section id="color" kicker="Palette" title="Colour">
        <h3 className="mono-label mb-3 opacity-70">Surfaces &amp; ink</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {surfaces.map((s) => (
            <Swatch
              key={s.cssVar}
              label={s.label}
              cssVar={s.cssVar}
              utility={s.utility}
              textOnSwatch={s.text ?? "ink"}
            />
          ))}
        </div>

        <h3 className="mono-label mb-3 mt-8 opacity-70">
          Globule chroma (base + deep shade)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {chroma.map((c) => (
            <div key={c.name} className="space-y-3">
              <Swatch
                label={c.name}
                cssVar={c.base}
                utility={`bg-${c.name}`}
                textOnSwatch={baseTextOnSwatch[c.name]}
              />
              <Swatch
                label={`${c.name}-d`}
                cssVar={c.shade}
                textOnSwatch="paper"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- semantic tokens ---------- */}
      <Section id="tokens" kicker="shadcn" title="Semantic tokens">
        <p className="mb-5 max-w-3xl text-sm text-ink/80">
          Every shadcn token maps onto a brand token, so editing one brand value
          retints components, prose, and globules together.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {semanticTokens.map((token) => (
            <div
              key={token}
              className="flex items-center gap-3 rounded-md border border-ink bg-paper p-2.5"
            >
              <span
                className="h-8 w-8 flex-none rounded-md border border-ink"
                style={{ backgroundColor: `var(${token})` }}
              />
              <Spec>{token}</Spec>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- typography ---------- */}
      <Section id="type" kicker="Type" title="Typography">
        <div className="space-y-px overflow-hidden rounded-md border border-ink">
          {typeSpecimens.map((t) => (
            <div
              key={t.cls}
              className="flex flex-col gap-2 bg-paper p-4 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <div className="min-w-0">{t.sample}</div>
              <div className="flex flex-none flex-col items-start gap-1 sm:items-end">
                <Spec>{t.cls}</Spec>
                <span className="font-mono text-[10px] text-ink/60">
                  {t.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- globules ---------- */}
      <Section id="globules" kicker="Signature" title="Globules">
        <p className="mb-5 max-w-3xl text-sm text-ink/80">
          The globule is the brand mark. Six palette colours cycle by index;
          finishes layer patterns over the glossy sphere.
        </p>

        <h3 className="mono-label mb-3 opacity-70">Palette spheres</h3>
        <div className="mb-8 flex flex-wrap items-end gap-5 rounded-md border border-ink bg-paper p-6">
          {globulePalette.map((g, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Globule globule={g} size={56} />
              <span className="font-mono text-[10px] text-ink/60">
                index {i}
              </span>
            </div>
          ))}
        </div>

        <h3 className="mono-label mb-3 opacity-70">Finishes</h3>
        <div className="mb-8 flex flex-wrap items-end gap-5 rounded-md border border-ink bg-paper p-6">
          {globulePatterns.map((p, i) => (
            <div key={p || "plain"} className="flex flex-col items-center gap-2">
              <Globule
                globule={globulePalette[i]}
                size={56}
                className={p}
              />
              <span className="font-mono text-[10px] text-ink/60">
                {p || "plain"}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-md border border-ink bg-paper p-5">
            <Monogram modifier="logo-monogram--sm" />
            <div>
              <div className="logo-wordmark">galaxy-brain</div>
              <span className="font-mono text-[10px] text-ink/60">
                Monogram + wordmark
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-ink bg-paper p-5">
            {globulePalette.slice(0, 5).map((g, i) => (
              <GlobuleDot key={i} globule={g} />
            ))}
            <span className="ml-1 font-mono text-[10px] text-ink/60">
              GlobuleDot (pills, statuses, bullets)
            </span>
          </div>
        </div>
      </Section>

      {/* ---------- buttons ---------- */}
      <Section id="buttons" kicker="Controls" title="Buttons">
        <div className="space-y-5 rounded-md border border-ink bg-paper p-6">
          {buttonSizes.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-3">
              <span className="w-16 font-mono text-[10px] text-ink/60">
                {size}
              </span>
              {buttonVariants.map((variant) => (
                <Button key={variant} variant={variant} size={size}>
                  {variant}
                </Button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-16 font-mono text-[10px] text-ink/60">
              disabled
            </span>
            <Button disabled>ink</Button>
            <Button variant="paper" disabled>
              paper
            </Button>
          </div>
        </div>
      </Section>

      {/* ---------- badges ---------- */}
      <Section id="badges" kicker="Controls" title="Badges">
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-ink bg-paper p-6">
          {badgeVariants.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
          <Badge variant="outline" mono>
            mono
          </Badge>
        </div>

        <h3 className="mono-label mb-3 mt-8 opacity-70">
          Status badges (status → globule colour)
        </h3>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-ink bg-paper p-6">
          {statusKeys.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      {/* ---------- cards ---------- */}
      <Section id="cards" kicker="Containers" title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <p className="text-sm text-ink/70">
                Header supports a title plus supporting copy.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink/85">
                Ink-bordered container on paper. Title uses{" "}
                <Spec>g-display</Spec>. Compose freely with header, content, and
                footer slots.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globule globule={globulePalette[3]} size={36} />
                <CardTitle>With a globule</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="soft">tag</Badge>
              <Badge variant="outline">label</Badge>
              <StatusBadge status="passed" />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ---------- surfaces ---------- */}
      <Section id="surfaces" kicker="Texture" title="Surfaces">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="paper flex h-28 items-end rounded-md border border-ink p-3">
            <Spec>.paper</Spec>
          </div>
          <div className="paper-soft flex h-28 items-end rounded-md border border-ink p-3">
            <Spec>.paper-soft</Spec>
          </div>
          <div className="flow-strip flex h-28 items-end rounded-md border border-ink p-3">
            <Spec>.flow-strip</Spec>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="eval-art relative flex h-28 items-end rounded-md border border-ink p-3">
            <span className="mono-label" style={{ color: "var(--paper)" }}>
              .eval-art
            </span>
          </div>
          <div className="flex h-28 flex-col justify-center gap-2 rounded-md border border-ink bg-paper p-4">
            <span className="font-mono text-[10px] text-ink/60">
              radius · --radius: 0.375rem
            </span>
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-md border border-ink bg-paper-soft" />
              <span className="text-sm text-ink/80">
                All <Spec>rounded-*</Spec> map to one soft radius.
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- dividers / links ---------- */}
      <Section id="dividers" kicker="Detail" title="Dividers &amp; links">
        <div className="rounded-md border border-ink bg-paper p-6">
          <p className="text-sm text-ink/80">Radix separator:</p>
          <Separator className="my-4" />
          <p className="text-sm text-ink/80">Globule rule:</p>
          <div className="g-rule" />
          <p className="text-sm text-ink/80">
            Prose link style:{" "}
            <a className="g-link" href="#color">
              jump to colour
            </a>
            .
          </p>
        </div>
      </Section>

      {/* ---------- prose ---------- */}
      <Section id="prose" kicker="Long-form" title="Prose / markdown">
        <p className="mb-5 max-w-3xl text-sm text-ink/80">
          Rendered markdown picks up <Spec>.markdown-target</Spec> styles
          (headings, lists, code, blockquotes, tables). Source for reference:
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <pre className="overflow-x-auto rounded-md border border-ink bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink/85">
            {sampleMarkdown}
          </pre>
          <div className="markdown-target rounded-md border border-ink bg-paper p-5">
            <h1>Heading one</h1>
            <p>
              Body copy uses <strong>Inter</strong> with a relaxed 1.7 line
              height for long-form prose.
            </p>
            <h2>Heading two</h2>
            <ul>
              <li>
                List markers tinted with <code>--magenta-d</code>
              </li>
              <li>
                Inline <code>code</code> sits on a paper chip
              </li>
              <li>
                <a href="#prose">Links</a> carry an indigo underline
              </li>
            </ul>
            <blockquote>
              Blockquotes get a 2px ink rule on the left.
            </blockquote>
            <pre>
              <code>const g = globuleForIndex(i);</code>
            </pre>
          </div>
        </div>
      </Section>
    </article>
  );
}
