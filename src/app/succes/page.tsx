import type { Metadata } from "next";
import { AchievementsPage } from "@/components/Milestones";

export const metadata: Metadata = { title: "Succès · THE LAST HUMAN" };

export default function Page() {
  return <AchievementsPage />;
}
