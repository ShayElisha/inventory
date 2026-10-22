import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const forced = session.mustChangePassword;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title={forced ? "החלפת סיסמה נדרשת" : "שינוי סיסמה"}
        description={
          forced
            ? "לפני השימוש במערכת יש להחליף את הסיסמה הזמנית"
            : "עדכון סיסמת ההתחברות לחשבון שלכם"
        }
      />
      <ChangePasswordForm forced={forced} />
    </div>
  );
}
