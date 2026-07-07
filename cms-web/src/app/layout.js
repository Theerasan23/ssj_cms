import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "ระบบจัดการเรื่องร้องเรียน · สสจ.นนทบุรี",
  description: "ระบบรับ บันทึก ติดตาม และปิดเคสเรื่องร้องเรียนผลิตภัณฑ์สุขภาพ — กลุ่มงานคุ้มครองผู้บริโภค สสจ.นนทบุรี",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
