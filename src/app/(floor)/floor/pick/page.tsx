import { requireTenant } from "@/lib/tenant";
import { FloorPick } from "@/components/floor-flow";

export default async function FloorPickPage() {
  await requireTenant();
  return <FloorPick />;
}
