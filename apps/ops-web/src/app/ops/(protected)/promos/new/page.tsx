import RequireAdminRole from "@/components/RequireAdminRole";
import NewPromoClient from "./new-client";

export default function NewPromoPage() {
  return (
    <RequireAdminRole
      allowedRoles={["GLOBAL_SUPER_ADMIN", "TOWN_SUPER_ADMIN"]}
    >
      <NewPromoClient />
    </RequireAdminRole>
  );
}