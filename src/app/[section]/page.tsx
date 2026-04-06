import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardSnapshot } from "@/lib/dashboard";

const sections = ["overview", "audience", "songs", "insights"] as const;

export type DashboardSection = (typeof sections)[number];

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardSectionPage({
  params,
  searchParams,
}: PageProps) {
  const [{ section }, resolvedSearchParams, snapshot] = await Promise.all([
    params,
    searchParams,
    getDashboardSnapshot(),
  ]);

  if (!sections.includes(section as DashboardSection)) {
    notFound();
  }

  return (
    <DashboardShell
      snapshot={snapshot}
      activeSection={section as DashboardSection}
      initialArtist={firstValue(resolvedSearchParams.artist)}
      initialGeo={firstValue(resolvedSearchParams.geo)}
      initialDuration={firstValue(resolvedSearchParams.duration)}
    />
  );
}
