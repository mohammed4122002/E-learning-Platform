import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { env } from "@/lib/env";
import "./globals.css";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "بوابة التدريب", template: "%s · بوابة التدريب" },
  description: "منصة بوابة التدريب: سجّل دوراتك، تابع حضورك ونتائجك، واحصل على شهادات موثّقة قابلة للتحقق.",
  applicationName: "بوابة التدريب",
  openGraph: { type: "website", locale: "ar_SA", siteName: "بوابة التدريب" },
};

export const viewport: Viewport = { themeColor: "#5b3cc4" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} antialiased`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
