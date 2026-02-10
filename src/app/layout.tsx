import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CustomCursor } from "@/components/CustomCursor";
import { Preloader } from "@/components/Preloader";
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
        className={`${syne.variable} ${dmSans.variable} noise-overlay min-h-screen bg-[#050505] text-white antialiased`}
      >
        <SmoothScroll />
        <CustomCursor />
        <Preloader />
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
