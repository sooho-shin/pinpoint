import { ButtonLink } from "@/components/atoms/Button";

export function LeaderboardTabs({ active = "daily", groupHref = "/ranking?tab=group" }: { active?: "daily" | "group"; groupHref?: string }) {
  return (
    <div className="grid h-[52px] w-[278px] grid-cols-2 gap-[14px]">
      <ButtonLink href="/ranking" variant={active === "daily" ? "primary" : "secondary"}>오늘</ButtonLink>
      <ButtonLink href={groupHref} variant={active === "group" ? "primary" : "secondary"}>그룹</ButtonLink>
    </div>
  );
}
