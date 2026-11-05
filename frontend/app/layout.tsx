import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { BackgroundArt } from "@/components/layout/background-art";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// Runs before the first paint so the saved or system theme never flashes.
const themeScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MindBridge",
  description:
    "Track everyday wellbeing and find professional support when you want it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <BackgroundArt />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
