import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "SentryPass Admin",
  description: "Venues, people and seat availability for SentryPass events.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
