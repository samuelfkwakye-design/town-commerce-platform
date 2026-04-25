import OpsLayoutShell from '../OpsLayoutShell';

export const dynamic = 'force-dynamic';

export default function ProtectedOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OpsLayoutShell missingImages={0}>{children}</OpsLayoutShell>;
}
