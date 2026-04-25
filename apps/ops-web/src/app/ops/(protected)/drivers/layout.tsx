import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drivers",
  description: "Manage drivers, availability, and assignments in Somame Ops.",
};

export default function DriversLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
