import type { Metadata } from "next";
import { AccountPage } from "@/components/AccountPanel";

export const metadata: Metadata = { title: "Compte · THE LAST HUMAN" };

export default function Page() {
  return <AccountPage />;
}
