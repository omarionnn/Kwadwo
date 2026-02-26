import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_bW9ja2VkLWNsZXJrLXB1Ymxpc2hhYmxlLWtleS1mb3ItYnVpbGQk"}>
      <html lang="en">
        <body style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
