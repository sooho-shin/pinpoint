import { AdminCandidateCard } from "@/components/organisms/AdminCandidateCard";
import { AdminReviewPanel } from "@/components/organisms/AdminReviewPanel";

export function AdminReviewTemplate() {
  return (
    <main className="app-shell">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <AdminCandidateCard />
        <AdminReviewPanel />
      </div>
    </main>
  );
}
