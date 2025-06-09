import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabAssistant AI",
  description: "AI Assistant for LCMS Troubleshooting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
