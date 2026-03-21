import type { ReactNode } from "react";

export const metadata = {
  title: "Town Commerce",
  description: "Town Commerce customer storefront",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
