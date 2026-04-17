import RequireAdminRole from "@/components/RequireAdminRole";
import EditPromoClient from "./edit-client";

export default function EditPromoPage() {
  return (
    <RequireAdminRole
      allowedRoles={["GLOBAL_SUPER_ADMIN", "TOWN_SUPER_ADMIN"]}
    >
      <EditPromoClient />
    </RequireAdminRole>
  );
}
