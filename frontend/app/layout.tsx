import type { Metadata } from "next";
import { AuthProvider } from "./auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardioPredict — Cardiovascular Risk Screening",
  description: "Authenticated machine-learning screening for cardiovascular disease risk.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
