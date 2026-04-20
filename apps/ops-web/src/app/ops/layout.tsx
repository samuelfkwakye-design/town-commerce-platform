import { headers } from 'next/headers';
import OpsLayoutShell from './OpsLayoutShell';

export const dynamic = 'force-dynamic';

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname =
    headersList.get('x-pathname') ||
    headersList.get('next-url') ||
    '';

  const isPublicOpsRoute =
    pathname === '/ops/login' ||
    pathname === '/ops/driver/login';

  if (isPublicOpsRoute) {
    return <>{children}</>;
  }

  return <OpsLayoutShell missingImages={0}>{children}</OpsLayoutShell>;
}