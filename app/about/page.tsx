import type { Metadata } from "next";
import Link from "next/link";

import { repoUrls } from "@/lib/content";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "About - galaxy-brain" };

const compLinks = [
  {
    href: "https://chat.lmsys.org/",
    title: "LMSYS Chatbot Arena",
    blurb:
      "Large-scale pairwise human preferences over model outputs; Elo-style leaderboards from crowd votes. The canonical example of subjective eval at scale.",
  },
  {
    href: "https://huggingface.co/spaces/lmsys/mt-bench",
    title: "MT-Bench",
    blurb:
      "Multi-turn dialogue benchmark scored with strong models (and originally designed to align with human judgment). Good reference for structured-but-still-quality-focused evaluation.",
  },
  {
    href: "https://tatsu-lab.github.io/alpaca_eval/",
    title: "AlpacaEval",
    blurb:
      "Automatic pairwise comparisons (often via a strong judge model) against reference outputs; correlates with human preferences on instruction-following.",
  },
  {
    href: "https://huggingface.co/spaces/allenai/WildBench",
    title: "WildBench",
    blurb:
      "Tasks mined from real user-chatbot logs, with model-based pairwise scoring designed to track human Arena rankings.",
  },
  {
    href: "https://crfm.stanford.edu/helm/",
    title: "HELM (Holistic Evaluation of Language Models)",
    blurb:
      "Broad, scenario-based reporting across accuracy, calibration, robustness, fairness, toxicity, and efficiency-not purely \u201cvibes,\u201d but a major effort to make comparisons transparent and multi-dimensional.",
  },
  {
    href: "https://www.swebench.com/",
    title: "SWE-bench",
    blurb:
      "Real GitHub issues patched end-to-end; the flagship objective benchmark for coding agents (pass/fail on applied patches). Complements subjective build-quality reviews.",
  },
  {
    href: "https://github.com/google-research/google-research/tree/master/instruction_following_eval",
    title: "Google IFEval",
    blurb:
      "Verifiable instruction-following checks (counts, formatting, constraints)-useful contrast to open-ended \u201chow good does this feel?\u201d grading.",
  },
];

export default function AboutPage() {
  const urls = repoUrls();

  return (
    <article className="max-w-none">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Overview</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>About</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="g-display text-4xl">About galaxy-brain</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink/90">
        This repo is a <strong>personal</strong> set of evals: prompts and tasks
        I care about, know well, and can judge consistently. The site is for{" "}
        <strong>comparing submissions side by side</strong> and{" "}
        <strong>tracking how outcomes change over time</strong> as models and
        harnesses improve.
      </p>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink/90">
        People can send <strong>pull requests</strong> with solutions; I run the
        evals myself (including open-ended or subjective parts) rather than
        outsourcing scoring to a crowd or an automated metric alone. That keeps
        the bar aligned with what I actually want from agents-not only what is
        easy to grade automatically.
      </p>

      <h2 className="g-display mt-10 text-2xl">
        Comparable efforts (larger or different in spirit)
      </h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink/90">
        If you are looking for <em>large-scale subjective</em> or
        &ldquo;quality in the wild&rdquo; comparisons, these are well-known
        references. They differ from this project in scale and governance, but
        they answer a similar &ldquo;which model feels better on hard
        tasks?&rdquo; question.
      </p>
      <ul className="mt-4 grid max-w-3xl list-none grid-cols-1 gap-3 pl-0">
        {compLinks.map((c) => (
          <li key={c.href} className="border border-ink bg-paper p-4">
            <a
              href={c.href}
              className="g-link font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.title}
            </a>
            <p className="mt-2 text-sm text-ink/90">{c.blurb}</p>
          </li>
        ))}
      </ul>

      <h2 className="g-display mt-10 text-2xl">Source</h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink/90">
        <a
          href={urls.repo}
          className="g-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Repository on GitHub
        </a>{" "}
        - eval prompts live next to submitted solutions; the static build embeds{" "}
        <code className="border border-paper-3 bg-paper-soft px-1.5 py-0.5 font-mono text-xs">
          docs/data.json
        </code>{" "}
        for the browser.
      </p>
    </article>
  );
}
