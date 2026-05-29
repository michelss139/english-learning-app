import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LANGBracket — Twoja osobista pomoc w nauce angielskiego",
  description: "Ucz się angielskiego z fiszkami, gramatyką i ćwiczeniami dopasowanymi do Twojego poziomu.",
  icons: {
    icon: "/langbracket-icon.svg",
    apple: "/langbracket-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
