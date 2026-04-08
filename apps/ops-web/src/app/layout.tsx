import type { Metadata } from "next";
import "./globals.css";

export const metadata = {
  title: 'Somame Ops — Operations Dashboard',
  description:
    'Manage orders, drivers, stock, and operations for the Somame Town Commerce Platform.',
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
