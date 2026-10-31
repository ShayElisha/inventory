import { redirect } from "next/navigation";

/** נתיב ישן — מועבר ל־/outbound כדי לא להתנגש עם /picks */
export default function PickRedirectPage() {
  redirect("/outbound");
}
