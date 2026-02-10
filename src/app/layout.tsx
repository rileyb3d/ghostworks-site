import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ghostworks",
  description: "Award-winning creative studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} ${dmSans.variable} min-h-screen bg-black text-white antialiased`}
      >
        <div className="pointer-events-none fixed inset-0 z-[100] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,120,120,0.08),transparent)]" />
        <div className="pointer-events-none fixed inset-0 z-[100] bg-[radial-gradient(ellipse_120%_80%_at_80%_100%,rgba(60,60,60,0.04),transparent)]" />
        <Header />
        <main className="pt-20">{children}</main>
      </body>
    </html>
  );
}
