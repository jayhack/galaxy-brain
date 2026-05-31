/**
 * Central class bundles for the static site, in the GLOBULE design kit.
 * Visual primitives (.g-btn, .g-card, .g-pill, .globule, …) live in
 * styles.css; this file just names the recipes app.js stamps out.
 */
export const ui = {
  /* Buttons */
  btnPrimarySm: "g-btn-cta", // rare globule pill CTA (e.g. "Open artifact")
  btnGhostSm: "g-btn g-btn-ghost g-btn-sm",
  btnSecondarySm: "g-btn g-btn-paper g-btn-sm",
  copyFeedbackSuccess: "g-copy-ok",
  copyFeedbackError: "g-copy-err",
  btnOutlineXs: "g-btn g-btn-paper g-btn-xs shrink-0",
  btnGhostXsCopy: "g-btn g-btn-ghost g-btn-xs",
  /** Primary icon + label (eval/solution "View on Github"). */
  btnPrimarySmGithub: "g-btn g-btn-ink g-btn-sm",
  /** "View on Github" when another control is the row primary. */
  btnOutlineSmGithub: "g-btn g-btn-paper g-btn-sm",
  /** Deployed HTML output. */
  btnOutlinePrimarySm: "g-btn g-btn-paper g-btn-sm",
  btnPrimarySmMt: "g-btn g-btn-ink g-btn-sm mt-6",

  /* Cards & panels */
  card: "g-card",
  cardHover: "g-card-hover",
  cardTitleSm: "g-display text-lg leading-tight",
  cardTitleLg: "g-display text-xl leading-tight",
  roundedPanel: "g-panel",
  aboutResourceCard: "g-card p-4",

  /* Badges / pills */
  badgeGhostSm: "g-pill",
  badgeEvalTagSm: "g-pill g-pill--soft",
  badgePrimarySm: "g-count",
  badgePrimaryOutline: "g-pill",
  badgeGhost: "g-pill",
  badgeOutlineSm: "g-pill g-pill--mono",
  badgeOutlineTech: "g-pill g-pill--mono g-pill--tech shrink-0",
  /** Solution header / outcome: harness badge (icon + short harness). */
  badgeGhostSmHarness: "g-pill g-pill--mono",
  harnessBadgeShort: "lowercase",
  /** Model-only pill (pairs with badgeGhostSmHarness). */
  badgeGhostSmModel: "g-pill g-pill--mono",
  /** Shared SVG size inside fixed harness icon slots. */
  harnessLogoSvgClass: "w-3.5 h-3.5",
  harnessIconSlotMd: "harness-icon-slot harness-icon-slot--md",
  harnessIconSlotSm: "harness-icon-slot harness-icon-slot--sm",
  harnessIconSlotSidebar: "harness-icon-slot harness-icon-slot--md",
  harnessIconSlotSolutionRow: "harness-icon-slot harness-icon-slot--md solution-row-harness-icon",
  harnessModelBadgesRow: "mt-1 flex flex-wrap items-center gap-1.5",
  badgeSizeSm: "",

  /* Typography */
  pageTitle: "g-display text-4xl sm:text-5xl",
  pageTitleMono: "font-mono text-2xl sm:text-3xl font-bold tracking-tight break-words",
  sectionTitle: "g-display text-2xl",
  heroTitle: "g-display text-3xl sm:text-5xl min-w-0",
  proseAboutH1: "g-display text-4xl",
  proseAboutH2: "g-display text-2xl mt-10",
  kvLabel: "mono-label opacity-60",
  themeGroupLabel: "mono-label",
  muted: "text-base-content/70",
  muted80: "text-base-content/80",
  muted85: "text-base-content/85",
  mutedSm: "mono-label opacity-55",
  metaMono:
    "text-[11px] sm:text-xs text-base-content/55 font-mono truncate shrink-0 max-w-[7.5rem] sm:max-w-[11rem]",
  summaryLine: "text-xs text-base-content/65 truncate min-w-0 flex-1",
  loadingRow: "flex items-center gap-2 text-base-content/60 text-sm",
  emptyDash: "text-base-content/50 text-sm",

  /* Layout */
  sectionSm: "mb-6",
  sectionMd: "mb-8",
  sectionLg: "mb-10",
  sectionHead: "flex items-center justify-between mb-3 w-full pb-2 border-b border-[var(--ink)]",
  sectionHeadRow: "flex items-center justify-between mb-3 pb-2 border-b border-[var(--ink)]",
  sectionHeadBaseline: "flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--ink)]",
  stackGapBtn: "mt-5 flex flex-wrap gap-2.5 items-center",
  flexGapBadge: "flex flex-wrap items-center gap-2 mb-3",
  flexGapTag: "flex items-center gap-2 mb-3 flex-wrap",
  solutionRowOuter:
    "flex flex-nowrap flex-row items-stretch w-full min-w-0 border border-[var(--ink)] bg-[var(--paper)] overflow-hidden hover:bg-[var(--paper-soft)]",
  solutionRowMain:
    "group flex flex-1 min-w-0 flex-nowrap flex-row items-center gap-2 sm:gap-3 px-3 py-2.5 no-underline",
  solutionRowSlug:
    "font-mono text-sm font-semibold text-base-content shrink-0 max-w-[40%] sm:max-w-none truncate",
  solutionRowRail:
    "flex items-center gap-1.5 sm:gap-2 shrink-0 border-l border-[var(--ink)] pl-2 pr-3 py-2",
  listColTight: "w-full flex flex-col gap-2",
  gridEvals: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  gridOutcome: "grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10",
  gridKv: "grid grid-cols-2 gap-3 mt-1",

  /* Hero & marketing */
  heroHome: "flow-strip border border-[var(--ink)] mb-8 relative overflow-hidden",
  hero404: "g-card",
  heroContent: "p-6 sm:p-10 text-left w-full relative z-10",
  heroEmoji: "logo-monogram",
  heroBrandGrid: "grid grid-cols-[auto_minmax(0,1fr)] gap-4 md:gap-6 items-center max-w-4xl",
  heroEmojiLockup: "logo-monogram logo-monogram--hero",
  badgeRowHero: "flex items-center gap-2 mb-4",
  flexTitleRow: "flex flex-wrap items-center gap-3 md:gap-5 mb-1",

  /* Prompt / README markdown containers */
  prosePrompt: "prose prose-sm max-w-none markdown-target min-h-[4rem] p-5",
  proseReadme: "prose prose-sm max-w-none g-card p-5 markdown-target",

  /* Breadcrumbs (injected) */
  crumbsWrap: "text-sm breadcrumbs breadcrumbs-header max-w-full min-w-0",
  crumbsUl: "flex-nowrap max-w-full",
  crumbLi: "min-w-0 shrink",
  crumbCurrent: "text-base-content/70",
  crumbCurrentTrunc: "text-base-content/70 min-w-0 truncate",
  crumbMonoTrunc: "text-base-content/70 font-mono min-w-0 truncate",
  aboutCrumbs: "text-sm breadcrumbs mb-4",

  /* Misc */
  externalLinkIcon: "w-4 h-4",
  externalLinkIconXs: "w-3.5 h-3.5 shrink-0",
};

/** The six globule colours, cycled to give each item its own sphere. */
export const globulePalette = [
  { color: "var(--cyan)", shade: "var(--cyan-d)" },
  { color: "var(--magenta)", shade: "var(--magenta-d)" },
  { color: "var(--lime)", shade: "var(--lime-d)" },
  { color: "var(--cobalt)", shade: "var(--cobalt-d)" },
  { color: "var(--sun)", shade: "var(--sun-d)" },
  { color: "var(--indigo)", shade: "var(--indigo-d)" },
];

export function globuleForIndex(i) {
  return globulePalette[((i % globulePalette.length) + globulePalette.length) % globulePalette.length];
}

/** status → globule colour for the status pill's dot. */
export const statusGlobule = {
  submitted: { color: "var(--cobalt)", shade: "var(--cobalt-d)" },
  passed: { color: "var(--lime)", shade: "var(--lime-d)" },
  failed: { color: "var(--magenta)", shade: "var(--magenta-d)" },
  in_progress: { color: "var(--sun)", shade: "var(--sun-d)" },
  skipped: { color: "var(--paper-3)", shade: "#9a8b5e" },
};

export function statusBadgeClasses() {
  return "g-status";
}
