import "../docs/styles.css";

const siteTitle = "galaxy-brain - agent evals";
const siteDescription =
  "A collection of agent evals. Browse evals, harnesses, models, and outcomes.";
const socialDescription =
  "A chromatic quarterly of agent evals - each eval is a prompt, each solution one harness/model pair's attempt at it.";
const favicon =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='34%25'%20cy='30%25'%20r='75%25'%3E%3Cstop%20offset='0%25'%20stop-color='%23ffffff'/%3E%3Cstop%20offset='12%25'%20stop-color='%23bdeef5'/%3E%3Cstop%20offset='52%25'%20stop-color='%232DC4D8'/%3E%3Cstop%20offset='100%25'%20stop-color='%23126974'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect%20width='100'%20height='100'%20fill='%23F2EAD0'/%3E%3Ccircle%20cx='50'%20cy='52'%20r='33'%20fill='url(%23g)'/%3E%3C/svg%3E";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://galaxy-brain.vercel.app"),
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: [{ url: favicon, type: "image/svg+xml" }],
  },
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

const tailwindConfig = `
  tailwind.config = {
    daisyui: {
      themes: [
        {
          globule: {
            "color-scheme": "light",
            primary: "#0A0908",
            "primary-content": "#F2EAD0",
            secondary: "#2DC4D8",
            "secondary-content": "#0A0908",
            accent: "#E04691",
            "accent-content": "#F2EAD0",
            neutral: "#0A0908",
            "neutral-content": "#F2EAD0",
            "base-100": "#EDEBE4",
            "base-200": "#E4E2D9",
            "base-300": "#CFCBBE",
            "base-content": "#0A0908",
            info: "#2347C8",
            "info-content": "#F2EAD0",
            success: "#316E1E",
            "success-content": "#F2EAD0",
            warning: "#8E6A0C",
            "warning-content": "#F2EAD0",
            error: "#6E1A45",
            "error-content": "#F2EAD0",
            "--rounded-box": "0rem",
            "--rounded-btn": "0rem",
            "--rounded-badge": "0rem",
            "--tab-radius": "0rem",
            "--border-btn": "1px",
            "--animation-btn": "0s",
            "--animation-input": "0s",
          },
        },
      ],
    },
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
          display: ['"Archivo Black"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
          serif: ['"Playfair Display"', 'Georgia', 'serif'],
        },
      },
    },
  };
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="globule">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4.12.14/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <script dangerouslySetInnerHTML={{ __html: tailwindConfig }} />
        <script src="https://cdn.tailwindcss.com?plugins=typography" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="paper min-h-screen text-base-content font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
