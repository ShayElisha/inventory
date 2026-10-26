import { FloorShelf } from "@/components/floor-flow";
import { requireTenant } from "@/lib/tenant";
import { canWrite } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FloorShelfPage() {
  const session = await requireTenant();
  if (!canWrite(session.role)) redirect("/dashboard");
  return <FloorShelf />;
}
