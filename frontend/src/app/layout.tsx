import type { Metadata } from "next";
import "./globals.css";
import "@/lib/design-tokens.css";

export const metadata: Metadata = {
  title: "RoomRental - Quản lý phòng trọ",
  description: "Nền tảng cho thuê phòng trọ uy tín",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
