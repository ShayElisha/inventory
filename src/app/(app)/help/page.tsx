import { HelpCenter } from "@/components/help-center";
import { requireTenant } from "@/lib/tenant";

export default async function HelpPage() {
  await requireTenant();
  return <HelpCenter />;
}
