import type { Metadata } from "next";
import { Michroma, Manrope, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

// Y2K chrome display face, a soft humanist body face, and a terminal mono for the Matrix layer
const display = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "BonAppTea — Viral Intelligence for Restaurants",
  description: "Spots food trends, vets local creators and watches rivals so restaurants can fill slow shifts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
