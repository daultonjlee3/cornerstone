import { redirect } from "next/navigation";

/**
 * Dashboard has been replaced by Operations Center.
 * Redirect so existing links and bookmarks continue to work.
 */
export default function DashboardPage() {
  redirect("/operations");
}
