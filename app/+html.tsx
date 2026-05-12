import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* 🚩 1. สำหรับ iOS Safari (Add to Home Screen) - เปลี่ยนชื่อเป็น smart-icon.png */}
        <link rel="apple-touch-icon" href="/smart-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/smart-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/smart-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/smart-icon.png" />
        
        {/* 🚩 2. สำหรับ Android Chrome และ Browser อื่นๆ */}
        <link rel="icon" type="image/png" href="/smart-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* 🚩 3. ตั้งค่า Web App สำหรับ iOS ให้เหมือนแอปจริง */}
        <meta name="apple-mobile-web-app-title" content="Smart Shop" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* ป้องกันการขยายหน้าจอเองเวลาพิมพ์ (เฉพาะบนมือถือบางรุ่น) */}
        <meta name="format-detection" content="telephone=no" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;