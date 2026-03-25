import type { Metadata } from "next";
import { Bricolage_Grotesque, Lato } from "next/font/google";
import Providers from "@/components/Providers";
import MobileGuard from "@/components/MobileGuard";
import "./globals.css";

const headingFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Lato({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "700"],
});
export const metadata: Metadata = {
  title: "FFCS Planner - Build Your Timetable",
  description: "Plan and build your perfect timetable with FFCS Planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
         className={`${headingFont.variable} ${bodyFont.variable} antialiased`}
      >
        <Providers>
          <MobileGuard>{children}</MobileGuard>
        </Providers>
      </body>
    </html>
  );
}
