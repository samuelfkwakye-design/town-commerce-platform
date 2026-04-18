import OpsLayoutShell from './OpsLayoutShell';

export const dynamic = 'force-dynamic';

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OpsLayoutShell missingImages={0}>{children}</OpsLayoutShell>;
}