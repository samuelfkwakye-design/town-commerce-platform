import { apiFetch } from '@/lib/api';
import OpsLayoutShell from './OpsLayoutShell';

export const dynamic = 'force-dynamic';

type OpsDashboardResponse = {
  productsMissingImages: number;
  lowStockCount: number;
  confirmedStaleCount: number;
};

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let snapshot: OpsDashboardResponse | null = null;

  try {
    snapshot = await apiFetch<OpsDashboardResponse>('/admin/reports/ops-dashboard', {
      method: 'GET',
    });
  } catch {
    snapshot = null;
  }

  const missingImages = snapshot?.productsMissingImages ?? 0;

  return (
    <OpsLayoutShell missingImages={missingImages}>
      {children}
    </OpsLayoutShell>
  );
}