import RequireAdminRole from "@/components/RequireAdminRole";
import AdminsClient from "./admins-client";

export default function AdminsPage() {
  return (
    <RequireAdminRole
      allowedRoles={["GLOBAL_SUPER_ADMIN", "TOWN_SUPER_ADMIN"]}
    >
      <AdminsClient />
    </RequireAdminRole>
  );
}
