import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
