import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/lib/loading-context";
import { PagePreloader } from "@/components/layout/page-preloader";
import { NotificationProvider } from "@/components/ui/notification-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FX Trading Journal",
  description: "Comprehensive FX trading journal for tracking trades, psychology, and performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <LoadingProvider>
          <NotificationProvider>
            <PagePreloader />
            {children}
          </NotificationProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
