import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/geist.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-geist-sans',
});

const geistMono = localFont({
  src: './fonts/geist-mono.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'daily pair · 하루 두 문제, 8주 코딩 스터디',
  description:
    'Python과 MySQL 매일 한 문제. 8주 일정, 집중 타이머, 풀이 기록과 재풀이 관리.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
