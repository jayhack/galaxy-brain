import LegacySite from "./LegacySite";

export default function HomePage() {
  return (
    <>
      <div className="drawer lg:drawer-open">
        <input id="nav-drawer" type="checkbox" className="drawer-toggle" />

        <div className="drawer-content flex flex-col">
          <header
            id="main-navbar"
            className="flex flex-col lg:flex-row lg:items-center lg:min-h-16 lg:h-16 paper-soft sticky top-0 z-30 border-b border-[var(--ink)]"
          >
            <div className="navbar min-h-0 h-auto py-0 flex flex-row flex-nowrap items-center justify-between min-h-14 h-14 shrink-0 lg:min-h-16 lg:h-16 lg:flex-none lg:order-2 lg:w-auto px-3 lg:px-5">
              <div className="flex-none lg:hidden">
                <label htmlFor="nav-drawer" className="g-icon-btn" aria-label="open menu">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block w-5 h-5 stroke-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </label>
              </div>

              <a
                id="navbar-brand"
                href="#/"
                className="logo-lockup lg:hidden"
                aria-label="galaxy-brain - home"
              >
                <span className="logo-monogram" aria-hidden="true">
                  <span className="logo-letter">G</span>
                  <span className="globule g-cyan logo-dot"></span>
                </span>
                <span className="logo-wordmark">galaxy-brain</span>
              </a>

              <div className="flex-1 min-w-0 lg:hidden" aria-hidden="true"></div>

              <div className="flex-none flex items-center gap-3">
                <span className="mono-label hidden sm:inline opacity-75">Agent&nbsp;Evals</span>
                <a
                  id="navbar-source"
                  href="#"
                  target="_blank"
                  rel="noopener"
                  className="g-btn g-btn-paper g-btn-xs hidden sm:inline-flex"
                >
                  Source -&gt;
                </a>
              </div>
            </div>

            <div
              id="header-breadcrumbs"
              className="order-3 w-full min-w-0 border-t border-[var(--ink)] py-2 px-4 sm:px-6 lg:order-1 lg:flex-1 lg:border-t-0 lg:py-0 lg:px-10 flex items-center overflow-x-auto overflow-y-hidden lg:overflow-hidden max-w-6xl lg:mx-auto"
              aria-live="polite"
            ></div>
          </header>

          <main id="view" className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-6xl w-full mx-auto">
            <div className="flex items-center justify-center py-24">
              <span className="loading loading-dots loading-lg text-secondary"></span>
            </div>
          </main>

          <footer className="border-t border-[var(--ink)] mt-4">
            <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="logo-monogram logo-monogram--sm" aria-hidden="true">
                  <span className="logo-letter">G</span>
                  <span className="globule g-cyan logo-dot"></span>
                </span>
                <span className="stamp-block">
                  galaxy-brain
                  <br />
                  agent x evals - next/vercel
                </span>
              </div>
              <p className="mono-label opacity-60">
                <a id="footer-repo-link" className="g-link" href="#">
                  view source on github -&gt;
                </a>
              </p>
            </div>
          </footer>
        </div>

        <aside className="drawer-side z-40">
          <label htmlFor="nav-drawer" className="drawer-overlay" aria-label="close menu"></label>
          <div className="min-h-full w-72 paper-soft border-r border-[var(--ink)] flex flex-col">
            <div className="sidebar-brand shrink-0 h-16 min-h-16 px-4 border-b border-[var(--ink)] flex items-center overflow-hidden">
              <a href="#/" className="logo-lockup flex items-center gap-2.5 min-w-0 flex-1">
                <span className="logo-monogram" aria-hidden="true">
                  <span className="logo-letter">G</span>
                  <span className="globule g-cyan logo-dot"></span>
                </span>
                <span className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="logo-wordmark truncate">galaxy-brain</span>
                  <span className="mono-label opacity-70 truncate">A collection of agent evals</span>
                </span>
              </a>
            </div>

            <nav id="sidebar-nav" className="p-2 flex-1 overflow-y-auto"></nav>

            <div className="shrink-0 border-t border-[var(--ink)] px-4 py-3 stamp-block opacity-70">
              cream - ink - six globules
            </div>
          </div>
        </aside>
      </div>
      <LegacySite />
    </>
  );
}
