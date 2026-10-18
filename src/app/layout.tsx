import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

const beVietnam = localFont({
  src: [
    { path: "../../public/fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "KOLVIA — Kết nối sáng tạo", template: "%s | KOLVIA" },
  description:
    "Kết nối KOL và nhà tổ chức sự kiện. Khám phá cơ hội, ứng tuyển và xây dựng những hợp tác ý nghĩa.",
  icons: {
    icon: { url: "/icon.png", type: "image/png", sizes: "1254x1254" },
    shortcut: "/icon.png",
    apple: { url: "/icon.png", sizes: "1254x1254", type: "image/png" },
  },
};
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className={beVietnam.variable}>
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
