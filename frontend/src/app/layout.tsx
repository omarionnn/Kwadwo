import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saafi AI — Voice Agent Platform",
  description: "Automate dealership calls with intelligent voice agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
        {children}
      </body>
    </html>
  );
}
