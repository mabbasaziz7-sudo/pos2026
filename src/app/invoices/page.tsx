import { redirect } from "next/navigation";

export default function InvoicesIndex() {
  redirect("/invoices/sales");
}
