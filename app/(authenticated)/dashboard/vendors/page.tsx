import { redirect } from "next/navigation";

export const metadata = {
  title: "Vendors | Cornerstone Tech",
  description: "Contractors & suppliers",
};

export default function VendorsPage() {
  redirect("/vendors");
}
