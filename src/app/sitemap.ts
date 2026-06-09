import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getActivePublicationDateKst } from "@/lib/puzzle/time";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 86400;

async function getArchiveUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("puzzle_publications")
      .select("id,publish_date_kst")
      .eq("status", "published")
      .lt("publish_date_kst", getActivePublicationDateKst())
      .order("publish_date_kst", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      url: `${siteUrl}/archive/${row.id}`,
      lastModified: new Date(row.publish_date_kst),
      changeFrequency: "monthly" as const,
      priority: 0.5
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const routes = [
    { path: "/", changeFrequency: "daily" as const, priority: 1 },
    { path: "/ranking", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/how-to-play", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/archive", changeFrequency: "daily" as const, priority: 0.6 },
    { path: "/puzzle-strategy", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/korean-word-association", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/difficulty", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/categories", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/faq", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/contact", changeFrequency: "yearly" as const, priority: 0.3 }
  ];

  const staticUrls = routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  return [...staticUrls, ...(await getArchiveUrls(siteUrl))];
}
