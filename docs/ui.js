/**
 * Central Tailwind / DaisyUI class bundles for the static site.
 * Refactor primitives here instead of grepping long strings across app.js.
 */
export const ui = {
  /* Buttons */
  btnPrimarySm: "btn btn-sm btn-primary",
  btnGhostSm: "btn btn-sm btn-ghost",
  btnSecondarySm: "btn btn-sm btn-secondary",
  copyFeedbackSuccess: "text-success",
  copyFeedbackError: "text-error",
  btnOutlineXs:
    "btn btn-xs btn-outline gap-1 h-7 min-h-7 px-2 shrink-0",
  btnGhostXsCopy:
    "btn btn-xs btn-ghost gap-1 h-7 min-h-7 px-2 text-base-content/70 hover:text-base-content",
  /** Primary icon + label (eval/solution “View on Github”). */
  btnPrimarySmGithub: "btn btn-sm btn-primary gap-1.5 min-h-9 h-9",
  /** “View on Github” when another control (e.g. Open artifact) is the row primary. */
  btnOutlineSmGithub: "btn btn-sm btn-outline gap-1.5 min-h-9 h-9",
  /** Deployed HTML output (outline). */
  btnOutlinePrimarySm: "btn btn-sm btn-outline btn-primary gap-1.5 min-h-9 h-9",
  btnPrimarySmMt: "btn btn-primary btn-sm mt-6",

  /* Cards & panels */
  card: "card bg-base-200 border border-base-300",
  cardHover:
    "card bg-base-200 hover:bg-base-300 border border-base-300 hover:border-primary/40",
  cardTitleSm: "card-title text-base",
  cardTitleLg: "card-title text-lg font-semibold",
  roundedPanel: "rounded-2xl border border-base-300 bg-base-200",
  aboutResourceCard: "border border-base-300 rounded-xl p-4 bg-base-200/50",

  /* Badges */
  badgeGhostSm: "badge badge-ghost badge-sm",
  badgeEvalTagSm:
    "badge badge-sm border border-base-content/20 bg-base-100 text-base-content/80 font-normal",
  badgePrimarySm: "badge badge-primary badge-sm",
  badgePrimaryOutline: "badge badge-primary badge-outline",
  badgeGhost: "badge badge-ghost",
  badgeOutlineSm: "badge badge-outline badge-sm",
  badgeOutlineTech:
    "badge badge-outline badge-sm font-mono shrink-0 max-w-[5.5rem] truncate",
  /** Solution header / outcome: harness badge (icon + short harness). */
  badgeGhostSmHarness:
    "badge badge-ghost badge-sm gap-1 pl-1.5 pr-2 py-0.5 h-auto min-h-0 inline-flex items-center",
  harnessBadgeShort: "font-mono lowercase",
  /** Model-only ghost badge (pairs with badgeGhostSmHarness). */
  badgeGhostSmModel: "badge badge-ghost badge-sm font-mono",
  /** Shared SVG size inside fixed harness icon slots (Simple Icons paths). */
  harnessLogoSvgClass: "w-3.5 h-3.5",
  harnessIconSlotMd: "harness-icon-slot harness-icon-slot--md",
  harnessIconSlotSm: "harness-icon-slot harness-icon-slot--sm",
  harnessIconSlotSidebar: "harness-icon-slot harness-icon-slot--md sidebar-harness-icon-slot",
  harnessIconSlotSolutionRow: "harness-icon-slot harness-icon-slot--md solution-row-harness-icon",
  harnessModelBadgesRow: "mt-1 flex flex-wrap items-center gap-1.5",
  /** Use after `badge <variant>` (single `badge` word only once). */
  badgeSizeSm: "badge-sm",

  /* Typography */
  pageTitle: "text-3xl font-bold tracking-tight",
  pageTitleMono: "text-3xl font-bold tracking-tight font-mono",
  sectionTitle: "text-xl font-semibold",
  heroTitle: "text-2xl sm:text-4xl font-bold tracking-tight text-base-content min-w-0",
  proseAboutH1: "text-3xl font-bold tracking-tight text-base-content",
  proseAboutH2: "text-xl font-semibold text-base-content mt-10",
  kvLabel: "text-xs uppercase text-base-content/50 tracking-wider",
  themeGroupLabel: "text-[10px] uppercase tracking-wider",
  muted: "text-base-content/70",
  muted80: "text-base-content/80",
  muted85: "text-base-content/85",
  mutedSm: "text-sm text-base-content/60",
  metaMono: "text-[11px] sm:text-xs text-base-content/55 font-mono truncate shrink-0 max-w-[7.5rem] sm:max-w-[11rem]",
  summaryLine: "text-xs text-base-content/65 truncate min-w-0 flex-1",
  loadingRow: "flex items-center gap-2 text-base-content/60 text-sm",
  emptyDash: "text-base-content/50 text-sm",

  /* Layout */
  sectionSm: "mb-6",
  sectionMd: "mb-8",
  sectionLg: "mb-10",
  sectionHead: "flex items-center justify-between mb-3 w-full",
  /** Like sectionHead without `w-full` (narrow columns). */
  sectionHeadRow: "flex items-center justify-between mb-3",
  sectionHeadBaseline: "flex items-baseline justify-between mb-4",
  stackGapBtn: "mt-4 flex flex-wrap gap-2",
  flexGapBadge: "flex flex-wrap items-center gap-2 mb-2",
  flexGapTag: "flex items-center gap-2 mb-2 flex-wrap",
  solutionRowOuter:
    "flex flex-nowrap flex-row items-stretch w-full min-w-0 rounded-lg border border-base-300 bg-base-200 overflow-hidden hover:border-primary/30",
  solutionRowMain:
    "group flex flex-1 min-w-0 flex-nowrap flex-row items-center gap-2 sm:gap-3 px-3 py-2 hover:bg-base-300/60",
  solutionRowSlug:
    "font-mono text-sm font-semibold text-base-content shrink-0 max-w-[40%] sm:max-w-none truncate",
  solutionRowRail:
    "flex items-center gap-1.5 sm:gap-2 shrink-0 border-l border-base-300/80 pl-2 pr-3 py-2",
  listColTight: "w-full flex flex-col gap-1.5",
  gridEvals: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  gridOutcome: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10",
  gridKv: "grid grid-cols-2 gap-3 mt-1",

  /* Hero & marketing */
  heroHome:
    "bg-base-200 rounded-xl border border-base-300 mb-8",
  hero404: "hero bg-base-200 rounded-2xl border border-base-300",
  heroContent: "p-6 sm:p-8 text-left w-full",
  heroEmoji:
    "inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-secondary text-4xl md:text-5xl leading-none select-none",
  /** Home hero: logo column stretches to text stack height; square via aspect-ratio. */
  heroBrandGrid:
    "grid grid-cols-[auto_minmax(0,1fr)] gap-4 md:gap-5 items-center max-w-4xl",
  heroEmojiLockup:
    "w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-4xl sm:text-5xl leading-none select-none",
  badgeRowHero: "flex items-center gap-2 mb-4",
  flexTitleRow: "flex flex-wrap items-center gap-3 md:gap-5 mb-1",

  /* Prompt / README markdown containers */
  prosePrompt:
    "prose prose-sm max-w-none markdown-target min-h-[4rem] p-4",
  proseReadme:
    "prose prose-sm max-w-none bg-base-200 border border-base-300 rounded-2xl p-4 markdown-target",

  /* Breadcrumbs (injected) */
  crumbsWrap:
    "text-sm breadcrumbs breadcrumbs-header max-w-full min-w-0",
  crumbsUl: "flex-nowrap max-w-full",
  crumbLi: "min-w-0 shrink",
  crumbCurrent: "text-base-content/70",
  crumbCurrentTrunc: "text-base-content/70 min-w-0 truncate",
  /** Last crumb: solution slug. */
  crumbMonoTrunc: "text-base-content/70 font-mono min-w-0 truncate",
  aboutCrumbs: "text-sm breadcrumbs mb-4",

  /* Misc */
  externalLinkIcon: "w-4 h-4",
  externalLinkIconXs: "w-3.5 h-3.5 shrink-0",
};

/** status → DaisyUI badge color class (without leading `badge`) */
export const statusBadgeVariant = {
  submitted: "badge-info",
  passed: "badge-success",
  failed: "badge-error",
  in_progress: "badge-warning",
  skipped: "badge-ghost",
};

export function statusBadgeClasses(status) {
  const variant = statusBadgeVariant[status] || "badge-ghost";
  return `badge ${variant} ${ui.badgeSizeSm} whitespace-nowrap capitalize inline-flex items-center`;
}
