import { requireModule } from "@/lib/tenant";
import { FloorPick } from "@/components/floor-flow";

export default async function FloorPickPage() {
  await requireModule("sales");
  return <FloorPick />;
}
