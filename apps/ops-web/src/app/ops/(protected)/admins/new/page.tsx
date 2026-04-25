import RequireAdminRole from "@/components/RequireAdminRole";
import NewAdminClient from "./new-client";

export default function NewAdminPage() {
  return (
    <RequireAdminRole
      allowedRoles={["GLOBAL_SUPER_ADMIN", "TOWN_SUPER_ADMIN"]}
    >
      <NewAdminClient />
    </RequireAdminRole>
  );
}
