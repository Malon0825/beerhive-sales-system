import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { Toaster } from "@/views/shared/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BeerHive POS",
  description: "Point of Sale System for BeerHive PUB",
  icons: {
    icon: '/beerhive-logo.png',
    shortcut: '/beerhive-logo.png',
    apple: '/beerhive-logo.png',
  },
};

/**
 * Root Layout Component
 * 
 * This is the top-level layout for the entire application.
 * It wraps all pages with common providers and components.
 * 
 * @param children - The child components/pages to render
 * 
 * Note: suppressHydrationWarning is used on the html element to prevent
 * hydration mismatch errors caused by browser extensions (e.g., DarkReader)
 * that modify HTML attributes before React hydrates.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
