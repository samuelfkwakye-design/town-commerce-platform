import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
  default: "KOSTOMA Ops",
  template: "%s — KOSTOMA Ops",
},
  description:
  "Manage orders, drivers, stock, and operations for KOSTOMA.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}