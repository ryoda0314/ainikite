import type { Metadata } from "next";
import { Rajdhani, Noto_Sans_JP, Geist_Mono } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MYLiFE!",
  description: "iLiFE!の自己紹介パートを自由に並べ替えて、自分だけのオリジナルを作ろう",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${rajdhani.variable} ${geistMono.variable} antialiased noise-overlay`}
      >
        {children}
      </body>
    </html>
  );
}
