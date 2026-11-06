import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "GridKit smoke test" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
