import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ممحاة الذكاء الاصطناعي",
  description: "منصة عربية لإزالة الشعارات والعناصر غير المرغوبة من الصور بجودة عالية"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
