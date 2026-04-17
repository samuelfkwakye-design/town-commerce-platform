import OpsLayoutShell from '@/components/OpsLayoutShell';

export const dynamic = 'force-dynamic';

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OpsLayoutShell>{children}</OpsLayoutShell>;
}