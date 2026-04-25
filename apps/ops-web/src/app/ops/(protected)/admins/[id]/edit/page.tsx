import RequireAdminRole from "@/components/RequireAdminRole";
import EditAdminClient from "./edit-client";

export default function EditAdminPage() {
  return (
    <RequireAdminRole
      allowedRoles={["GLOBAL_SUPER_ADMIN", "TOWN_SUPER_ADMIN"]}
    >
      <EditAdminClient />
    </RequireAdminRole>
  );
}
