import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Atkinson Hyperlegible: designed so letters that are easy to confuse
// (I, l, 1 or b, d) look clearly different. Bundled with the app, so it
// works without internet.
const atkinson = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  weight: "200 800",
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Tsinda",
  description: "Learn and prepare for the Primary Leaving Exam.",
};

export const viewport: Viewport = {
  colorScheme: "only light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
