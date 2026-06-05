import {
  Archivo_Black,
  Playfair_Display,
  Inter,
  JetBrains_Mono,
} from "next/font/google";

// Self-hosted via next/font (no Google Fonts CDN at runtime).
// To change a typeface, swap the loader here; the CSS vars below are wired
// into app/globals.css (@theme: --font-display / --font-sans / ...).

export const fontDisplay = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo",
  display: "swap",
});

export const fontSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = [
  fontDisplay.variable,
  fontSerif.variable,
  fontSans.variable,
  fontMono.variable,
].join(" ");
