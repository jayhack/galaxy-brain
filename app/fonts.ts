import {
  Archivo_Black,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";

// Self-hosted via next/font (no Google Fonts CDN at runtime).
// To change a typeface, swap the loader here; the CSS vars below are wired
// into app/globals.css (@theme: --font-display / --font-sans / --font-logo).

// Archivo Black is kept for the logo lockup only (its weight is the brand mark).
export const fontLogo = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo",
  display: "swap",
});

// Space Grotesk for body copy, headings, and eval titles (replaces Inter).
export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = [
  fontLogo.variable,
  fontDisplay.variable,
  fontMono.variable,
].join(" ");
