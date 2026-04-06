"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bot,
  LayoutDashboard,
  Lightbulb,
  Music2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { formatCompactNumber, titleCase } from "@/lib/format";
import type {
  AudienceMarket,
  ChartPoint,
  DashboardSnapshot,
  MetricCard,
  OverviewMarket,
  SourceMixItem,
} from "@/lib/types";

type DashboardSection = "overview" | "audience" | "songs" | "insights";
type DurationValue = "12m" | "28d";
type ChatMessage = { id: string; role: "assistant" | "user"; text: string };

type DashboardShellProps = {
  snapshot: DashboardSnapshot;
  activeSection: DashboardSection;
  initialArtist?: string;
  initialGeo?: string;
  initialDuration?: string;
};

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "audience", label: "Audience", icon: Users },
  { id: "songs", label: "Songs", icon: Music2 },
  { id: "insights", label: "Insights", icon: Lightbulb },
] as const;

const palette = ["#8b5cf6", "#22d3ee", "#34d399", "#fb7185", "#60a5fa", "#8b5cf6"];
const metricColors: Record<string, string> = {
  Listeners: "#8b5cf6",
  Streams: "#22d3ee",
  Saves: "#fb7185",
  Followers: "#34d399",
  "Monthly active listeners": "#60a5fa",
  "Active sources": "#a78bfa",
};

export function DashboardShell({
  snapshot,
  activeSection,
  initialArtist,
  initialGeo,
  initialDuration,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const artistOptions = [snapshot.artistName];
  const durationOptions = useMemo(() => getDurationOptions(activeSection), [activeSection]);
  const [artist, setArtist] = useState(
    artistOptions.includes(initialArtist ?? "") ? (initialArtist as string) : snapshot.artistName,
  );
  const [duration, setDuration] = useState<DurationValue>(
    durationOptions.includes(initialDuration as DurationValue)
      ? (initialDuration as DurationValue)
      : durationOptions[0],
  );
  const effectiveDuration = durationOptions.includes(duration) ? duration : durationOptions[0];

  const geos = useMemo(
    () => getGeos(snapshot, activeSection, effectiveDuration),
    [snapshot, activeSection, effectiveDuration],
  );
  const [geo, setGeo] = useState(geos.includes(initialGeo ?? "") ? (initialGeo as string) : (geos[0] ?? ""));
  const effectiveGeo = geos.includes(geo) ? geo : (geos[0] ?? "");
  const overview = snapshot.overviewMarkets.find((item) => item.region === effectiveGeo) ?? snapshot.overviewMarkets[0] ?? null;
  const audience = snapshot.audienceMarkets.find((item) => item.region === effectiveGeo) ?? snapshot.audienceMarkets[0] ?? null;
  const topGrowthMarket = getTopGrowthMarket(snapshot.overviewMarkets);
  const recommendations = buildRecommendations(overview, audience, topGrowthMarket, snapshot.sourceMix);
  const welcome = `Hey! I'm Pulse AI. Ask about ${effectiveGeo}, ${topGrowthMarket}, release strategy, campaigns, or audience opportunities.`;
  const chatKey = `${activeSection}-${effectiveGeo}-${effectiveDuration}`;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("artist", artist);
    if (effectiveGeo) params.set("geo", effectiveGeo);
    params.set("duration", effectiveDuration);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [artist, effectiveDuration, effectiveGeo, pathname, router]);

  const tabHref = (section: DashboardSection) => {
    const nextDuration = getDurationOptions(section).includes(effectiveDuration)
      ? effectiveDuration
      : getDurationOptions(section)[0];
    const params = new URLSearchParams();
    params.set("artist", artist);
    if (effectiveGeo) params.set("geo", effectiveGeo);
    params.set("duration", nextDuration);
    return `/${section}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_22%),linear-gradient(180deg,_#090a0f_0%,_#11131a_48%,_#08090d_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1660px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="surface px-6 py-6 md:px-8 md:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#c4b5fd]">
                <Sparkles className="h-3.5 w-3.5" />
                Pulse for Artists
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Artist intelligence, audience context, songs, and strategy.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                A modern command center for performance, audience behavior, song momentum, and strategy.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
              {artist} · {effectiveGeo || "Global"} · {effectiveDuration === "12m" ? "12 months" : "28 days"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <FilterCard label="Artist">
              <Pills options={artistOptions} value={artist} onChange={setArtist} />
            </FilterCard>
            <FilterCard label="Geo">
              <Pills options={geos} value={effectiveGeo} onChange={setGeo} />
            </FilterCard>
            <FilterCard label="Duration">
              <Pills
                options={durationOptions}
                value={effectiveDuration}
                onChange={(value) => setDuration(value as DurationValue)}
                formatLabel={(value) => (value === "12m" ? "12 Months" : "28 Days")}
              />
            </FilterCard>
          </div>

          <nav className="mt-6 flex flex-wrap items-center gap-2 rounded-[30px] border border-white/10 bg-black/20 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeSection;
              return (
                <Link
                  key={tab.id}
                  href={tabHref(tab.id)}
                  className={`group relative flex min-w-[145px] items-center justify-center gap-2 rounded-[24px] px-5 py-3 text-sm font-semibold transition duration-300 ${
                    active
                      ? "bg-[linear-gradient(135deg,rgba(139,92,246,0.24),rgba(255,255,255,0.08))] text-white shadow-[0_16px_30px_rgba(139,92,246,0.15)]"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[#c4b5fd]" : "text-slate-500 group-hover:text-white"}`} />
                  <span>{tab.label}</span>
                  {active ? <span className="h-2 w-2 rounded-full bg-[#c4b5fd]" /> : null}
                </Link>
              );
            })}
            <div className="ml-auto hidden rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 xl:flex">
              Client dashboard
            </div>
          </nav>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            {activeSection === "overview" ? <OverviewPage overview={overview} sourceMix={snapshot.sourceMix} allMarkets={snapshot.overviewMarkets} /> : null}
            {activeSection === "audience" ? <AudiencePage audience={audience} /> : null}
            {activeSection === "songs" ? <SongsPage audience={audience} geo={effectiveGeo} /> : null}
            {activeSection === "insights" ? <InsightsPage overview={overview} audience={audience} recommendations={recommendations} allMarkets={snapshot.overviewMarkets} sourceMix={snapshot.sourceMix} /> : null}
          </main>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <RailCard title="Smart insight" icon={TrendingUp}>
              {recommendations[0]}
            </RailCard>
            <RailCard title="Recommendations" icon={Lightbulb}>
              <div className="space-y-3">
                {recommendations.slice(1, 4).map((item, index) => (
                  <div key={item} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action {index + 1}</div>
                    <div className="mt-2">{item}</div>
                  </div>
                ))}
              </div>
            </RailCard>
            <PulseAIChat
              key={chatKey}
              welcome={welcome}
              overview={overview}
              audience={audience}
              topGrowthMarket={topGrowthMarket}
              topSource={snapshot.sourceMix[0]?.label ?? "Active sources"}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function OverviewPage({
  overview,
  sourceMix,
  allMarkets,
}: {
  overview: OverviewMarket | null;
  sourceMix: SourceMixItem[];
  allMarkets: OverviewMarket[];
}) {
  const cards = ["Listeners", "Streams", "Saves", "Followers"].map((label) => findCard(overview?.cards, label)).filter(Boolean) as MetricCard[];
  const series = (overview?.series ?? []).filter((item) => ["Listeners", "Streams", "Saves", "Followers"].includes(item.label));
  const marketBars = [...allMarkets]
    .map((market) => ({
      label: market.region,
      value: parseLabel(findCard(market.cards, "Streams")?.valueLabel ?? "0"),
      helper: `${findCard(market.cards, "Listeners")?.valueLabel ?? "0"} listeners`,
      delta: findCard(market.cards, "Streams")?.deltaLabel ?? "",
    }))
    .sort((left, right) => right.value - left.value);

  return (
    <>
      <PageIntro
        label="Overview"
        title={`${overview?.region ?? "Selected"} performance snapshot`}
        text={overview?.statsPeriod ?? "Long-range performance and source mix for the selected market."}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} title={card.label} value={card.valueLabel} helper={`${card.deltaLabel} vs previous period`} positive={(card.deltaValue ?? 0) >= 0} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {series.map((item) => (
          <LinePanel key={item.label} title={item.label} points={item.points} color={metricColors[item.label] ?? palette[0]} />
        ))}
      </div>
      <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <SectionCard label="Market comparison" title="Top markets by streams">
          <BarsList items={marketBars} />
        </SectionCard>
        <SectionCard label="Source mix" title="Where listeners come from">
          <DonutChart
            label="Sources"
            data={sourceMix.slice(0, 5).map((item, index) => ({
              label: item.label,
              value: item.listeners,
              color: palette[index % palette.length],
            }))}
          />
        </SectionCard>
      </div>
    </>
  );
}

function AudiencePage({ audience }: { audience: AudienceMarket | null }) {
  const totalListeners = audience?.genders.reduce((sum, item) => sum + item.listeners, 0) ?? 0;
  const countries = (audience?.topCountries ?? []).map((item) => ({
    label: `${item.rank}. ${item.label}`,
    value: item.listeners,
    helper: item.activePercent !== null ? `${item.activePercent.toFixed(0)}% active listeners` : `${formatCompactNumber(item.listeners)} listeners`,
  }));
  const cities = (audience?.topCities ?? []).map((item) => ({
    label: `${item.rank}. ${item.label}`,
    value: item.listeners,
    helper: item.activePercent !== null ? `${item.activePercent.toFixed(0)}% active listeners` : `${formatCompactNumber(item.listeners)} listeners`,
  }));

  return (
    <>
      <PageIntro
        label="Audience"
        title={`${audience?.region ?? "Selected"} audience composition`}
        text="Demographics, audience segments, and geographic concentration for the current market."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Audience size" value={formatCompactNumber(totalListeners)} helper="Tracked in the latest audience window" positive />
        <StatCard title="Top segment" value={titleCase(audience?.segments?.[0]?.segment ?? "—")} helper={`${audience?.segments?.[0]?.percent.toFixed(0) ?? "0"}% share`} positive />
        <StatCard title="Top country" value={audience?.topCountries?.[0]?.label ?? "—"} helper={`${formatCompactNumber(audience?.topCountries?.[0]?.listeners ?? 0)} listeners`} positive />
        <StatCard title="Top city" value={audience?.topCities?.[0]?.label ?? "—"} helper={`${formatCompactNumber(audience?.topCities?.[0]?.listeners ?? 0)} listeners`} positive={false} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard label="Gender" title="Listener split">
          <DonutChart
            label="Listeners"
            data={(audience?.genders ?? []).map((item, index) => ({
              label: item.gender,
              value: item.listeners,
              color: palette[index % palette.length],
            }))}
          />
        </SectionCard>
        <SectionCard label="Segments" title="Audience cohorts">
          <DonutChart
            label="Share"
            data={(audience?.segments ?? []).map((item, index) => ({
              label: titleCase(item.segment),
              value: item.percent,
              color: palette[index % palette.length],
            }))}
          />
        </SectionCard>
      </div>
      <SectionCard label="Age distribution" title="Core listening cohorts">
        <div className="space-y-4">
          {(audience?.ages ?? []).map((age) => {
            const total = Math.max(age.totalListeners, 1);
            const segments = [
              { value: age.female, color: palette[0], label: "Female" },
              { value: age.male, color: palette[1], label: "Male" },
              { value: age.nonBinary, color: palette[2], label: "Non-binary" },
              { value: age.notSpecified, color: palette[3], label: "Not specified" },
            ].filter((item) => item.value > 0);
            return (
              <div key={age.ageRange} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{age.ageRange}</div>
                    <div className="mt-1 text-xs text-slate-400">{age.percentOfListeners.toFixed(0)}% of listeners</div>
                  </div>
                  <div className="text-sm font-semibold text-white">{formatCompactNumber(age.totalListeners)}</div>
                </div>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/6">
                  {segments.map((segment) => (
                    <div key={`${age.ageRange}-${segment.label}`} style={{ width: `${Math.max((segment.value / total) * 100, 2)}%`, backgroundColor: segment.color }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard label="Top countries" title="Country concentration">
          <BarsList items={countries} />
        </SectionCard>
        <SectionCard label="Top cities" title="City concentration">
          <BarsList items={cities} />
        </SectionCard>
      </div>
    </>
  );
}

function SongsPage({ audience, geo }: { audience: AudienceMarket | null; geo: string }) {
  const releases = audience?.releases ?? [];
  const leadRelease = [...releases].sort((left, right) => right.peakValue - left.peakValue)[0] ?? null;

  return (
    <>
      <PageIntro
        label="Songs"
        title={`${geo || "Selected"} song and release performance`}
        text="Release-focused performance with a Spotify-for-Artists style song dashboard."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Lead release" value={leadRelease?.releaseName ?? "—"} helper="Highest peak across tracked release metrics" positive />
        <StatCard title="Tracked metrics" value={`${releases.length}`} helper="Release signals currently available" positive />
        <StatCard title="Top metric" value={leadRelease?.toggle ?? "—"} helper={`Peak ${formatCompactNumber(leadRelease?.peakValue ?? 0)}`} positive />
        <StatCard title="Market" value={geo || "—"} helper="Current song page filter" positive={false} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {releases.map((release, index) => (
          <LinePanel key={`${release.releaseName}-${release.toggle}`} title={`${release.releaseName} · ${release.toggle}`} points={release.points} color={metricColors[release.toggle] ?? palette[index % palette.length]} />
        ))}
      </div>
      <SectionCard label="Song table" title="Tracked releases">
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/15">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-400">
              <tr>
                <th className="px-5 py-4 font-medium">Song / Release</th>
                <th className="px-5 py-4 font-medium">Metric</th>
                <th className="px-5 py-4 font-medium">Peak</th>
                <th className="px-5 py-4 font-medium">Latest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {releases.map((release) => (
                <tr key={`${release.releaseName}-${release.toggle}`} className="text-slate-200">
                  <td className="px-5 py-4 font-medium text-white">{release.releaseName}</td>
                  <td className="px-5 py-4">{release.toggle}</td>
                  <td className="px-5 py-4">{formatCompactNumber(release.peakValue)}</td>
                  <td className="px-5 py-4">{formatCompactNumber(release.points[release.points.length - 1]?.value ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

function InsightsPage({
  overview,
  audience,
  recommendations,
  allMarkets,
  sourceMix,
}: {
  overview: OverviewMarket | null;
  audience: AudienceMarket | null;
  recommendations: string[];
  allMarkets: OverviewMarket[];
  sourceMix: SourceMixItem[];
}) {
  const compare = [...allMarkets]
    .map((market) => ({
      label: market.region,
      value: parseLabel(findCard(market.cards, "Listeners")?.valueLabel ?? "0"),
      helper: `${findCard(market.cards, "Streams")?.valueLabel ?? "0"} streams`,
      delta: findCard(market.cards, "Streams")?.deltaLabel ?? "",
    }))
    .sort((left, right) => right.value - left.value);

  return (
    <>
      <PageIntro
        label="Insights"
        title="Strategy and recommendation layer"
        text="Client-facing interpretation of the data with practical next steps and market opportunities."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard title="Top growth market" value={getTopGrowthMarket(allMarkets)} helper="Best expansion signal from the current overview set" positive />
        <StatCard title="Lead segment" value={titleCase(audience?.segments?.[0]?.segment ?? "—")} helper="Audience cohort to build around next" positive />
        <StatCard title="Lead source" value={truncate(sourceMix[0]?.label ?? "Active sources", 22)} helper="Discovery surface worth reinforcing" positive={false} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <SectionCard label="Recommendations" title="Priority actions">
          <div className="space-y-4">
            {recommendations.map((item, index) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recommendation {index + 1}</div>
                <div className="mt-2 text-sm leading-7 text-slate-200">{item}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard label="Markets" title="Where to invest next">
          <BarsList items={compare} />
        </SectionCard>
      </div>
      <SectionCard label="Current KPI context" title="Why this matters">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(overview?.cards ?? []).slice(0, 4).map((card) => (
            <StatCard key={card.label} title={card.label} value={card.valueLabel} helper={`${card.deltaLabel} vs previous period`} positive={(card.deltaValue ?? 0) >= 0} />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function PageIntro({ label, title, text }: { label: string; title: string; text: string }) {
  return (
    <SectionCard label={label} title={title}>
      <p className="max-w-3xl text-sm leading-7 text-slate-300">{text}</p>
    </SectionCard>
  );
}

function SectionCard({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="surface overflow-hidden p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(0,0,0,0.28)] md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FilterCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Pills({
  options,
  value,
  onChange,
  formatLabel,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  formatLabel?: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full border px-3 py-2 text-sm transition duration-300 ${
            value === option
              ? "border-[#8b5cf6]/35 bg-[linear-gradient(135deg,rgba(139,92,246,0.22),rgba(255,255,255,0.06))] text-white shadow-[0_10px_24px_rgba(139,92,246,0.16)]"
              : "border-white/8 bg-white/[0.03] text-slate-300 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.06]"
          }`}
        >
          {formatLabel ? formatLabel(option) : option}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  positive,
}: {
  title: string;
  value: string;
  helper: string;
  positive: boolean;
}) {
  return (
    <div className="surface overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full ${positive ? "bg-emerald-300" : "bg-[#c4b5fd]"}`} />
            {title}
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.15rem]">{value}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${positive ? "bg-emerald-500/12 text-emerald-300" : "bg-white/8 text-slate-300"}`}>
          {positive ? "Momentum" : "Context"}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{helper}</p>
    </div>
  );
}

function RailCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof TrendingUp;
  children: ReactNode;
}) {
  return (
    <section className="surface overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
        </div>
        <div className="rounded-2xl bg-white/8 p-2 text-[#c4b5fd]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PulseAIChat({
  welcome,
  overview,
  audience,
  topGrowthMarket,
  topSource,
}: {
  welcome: string;
  overview: OverviewMarket | null;
  audience: AudienceMarket | null;
  topGrowthMarket: string;
  topSource: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: welcome },
  ]);
  const [draft, setDraft] = useState("");

  const submitPrompt = (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-u`, role: "user", text: clean },
      {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: buildAssistantReply(clean, overview, audience, topGrowthMarket, topSource),
      },
    ]);
    setDraft("");
  };

  const promptChips = [
    "What's driving growth?",
    "Which city next?",
    "Build a campaign",
    "What should I push?",
  ];

  return (
    <section className="surface overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pulse AI</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Your strategic assistant</h3>
        </div>
        <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(139,92,246,0.25),rgba(255,255,255,0.08))] p-2 text-[#c4b5fd] shadow-[0_12px_24px_rgba(139,92,246,0.14)]">
          <Bot className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Context synced</div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Live filters
          </div>
        </div>
        <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[92%] rounded-[22px] border p-4 text-sm leading-6 shadow-[0_10px_26px_rgba(0,0,0,0.14)] ${
                message.role === "assistant"
                  ? "mr-auto border-white/10 bg-white/[0.05] text-slate-200"
                  : "ml-auto border-[#8b5cf6]/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.22),rgba(139,92,246,0.08))] text-white"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Try asking</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {promptChips.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submitPrompt(prompt)}
              className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitPrompt(draft);
        }}
      >
        <div className="rounded-[26px] border border-white/10 bg-black/20 p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Ask about audience, campaigns, songs, or next steps..."
          />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Artist context ready</div>
            <button
              type="submit"
              className="rounded-full bg-[linear-gradient(135deg,#8b5cf6,#c4b5fd)] px-4 py-2 text-sm font-semibold text-[#1f1305] shadow-[0_14px_30px_rgba(139,92,246,0.24)] transition hover:scale-[1.01]"
            >
              Ask Pulse AI
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function BarsList({
  items,
}: {
  items: Array<{ label: string; value: number; helper: string; delta?: string }>;
}) {
  const max = items[0]?.value ?? 0;
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{item.label}</div>
              <div className="mt-1 text-xs text-slate-400">{item.helper}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{formatCompactNumber(item.value)}</div>
              {item.delta ? <div className="mt-1 text-xs text-slate-400">{item.delta}</div> : null}
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/6">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${max > 0 ? Math.max((item.value / max) * 100, 6) : 0}%`,
                background: `linear-gradient(90deg, ${palette[index % palette.length]}, ${palette[index % palette.length]}aa)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  label,
  data,
}: {
  label: string;
  data: Array<{ label: string; value: number; color: string }>;
}) {
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const segments = useMemo(
    () =>
      data.reduce<Array<{ label: string; value: number; color: string; length: number; offset: number }>>(
        (accumulator, item) => {
          const previous = accumulator[accumulator.length - 1];
          const length = (item.value / total) * circumference;
          const offset = previous ? previous.offset - previous.length : 0;
          return [...accumulator, { ...item, length, offset }];
        },
        [],
      ),
    [circumference, data, total],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <svg viewBox="0 0 160 160" className="h-40 w-40">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />
            {segments.map((item) => (
              <circle
                key={item.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${item.length} ${circumference - item.length}`}
                strokeDashoffset={item.offset}
                transform="rotate(-90 80 80)"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{formatCompactNumber(total)}</div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex items-start gap-2 text-sm font-semibold text-white">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="break-words">{item.label}</span>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-white">{formatCompactNumber(item.value)}</div>
                <div className="mt-1 text-[11px] text-slate-400">{Math.round((item.value / total) * 100)}%</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/6">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max((item.value / total) * 100, 6)}%`,
                  background: `linear-gradient(90deg, ${item.color}, ${item.color}aa)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinePanel({
  title,
  points,
  color,
}: {
  title: string;
  points: ChartPoint[];
  color: string;
}) {
  const options = useMemo(
    () =>
      points.length > 90
        ? [
            { key: "30", label: "30D", count: 30 },
            { key: "90", label: "90D", count: 90 },
            { key: "180", label: "6M", count: 180 },
            { key: "all", label: "All", count: null },
          ]
        : [
            { key: "7", label: "7D", count: 7 },
            { key: "14", label: "14D", count: 14 },
            { key: "28", label: "28D", count: 28 },
            { key: "all", label: "All", count: null },
          ],
    [points.length],
  );
  const [windowKey, setWindowKey] = useState(options[options.length - 1]?.key ?? "all");
  const filtered = useMemo(() => {
    const option = options.find((item) => item.key === windowKey);
    if (!option || option.count === null) return points;
    return points.slice(-option.count);
  }, [options, points, windowKey]);

  const chart = useMemo(() => buildLineChart(filtered), [filtered]);
  const latestValue = filtered[filtered.length - 1]?.value ?? 0;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const safeIndex = activeIndex !== null && activeIndex < filtered.length
    ? activeIndex
    : Math.max(filtered.length - 1, 0);
  const activePoint = filtered[safeIndex] ?? null;

  return (
    <section className="surface overflow-hidden p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(0,0,0,0.28)] md:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-3xl font-semibold tracking-tight text-white">{axisValue(latestValue)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Localized calendar filters and improved chart spacing.</p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {activePoint ? `${formatDateLabel(activePoint.label)} · ${axisValue(activePoint.value)}` : "Hover a point"}
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWindowKey(option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                windowKey === option.key
                  ? "border-white/20 bg-white/[0.12] text-white shadow-[0_8px_24px_rgba(255,255,255,0.08)]"
                  : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.08))] p-5">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{title}</span>
          </div>
          <span>{filtered[0]?.label ?? "Start"} → {filtered[filtered.length - 1]?.label ?? "Latest"}</span>
        </div>
        <svg viewBox="0 0 700 270" className="h-auto w-full">
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = 28 + (tick / 4) * 186;
            const value = chart.maxValue - (tick / 4) * chart.maxValue;
            return (
              <g key={tick}>
                <line x1="70" x2="664" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                <text x="56" y={y + 4} textAnchor="end" fontSize="11" fill="rgba(226,232,240,0.72)">
                  {axisValue(value)}
                </text>
              </g>
            );
          })}
          <line x1="70" x2="664" y1="214" y2="214" stroke="rgba(255,255,255,0.16)" />
          <line x1="70" x2="70" y1="24" y2="214" stroke="rgba(255,255,255,0.16)" />
          <path d={chart.areaPath} fill={`${color}20`} />
          <path d={chart.linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {activePoint ? (
            <line
              x1={chart.points[safeIndex]?.x ?? 0}
              x2={chart.points[safeIndex]?.x ?? 0}
              y1="28"
              y2="214"
              stroke={`${color}88`}
              strokeDasharray="4 6"
            />
          ) : null}
          {chart.points.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${point.label}`}
              cx={point.x}
              cy={point.y}
              r={index === safeIndex ? "5" : "3"}
              fill={color}
              stroke="#0b0f14"
              strokeWidth="2"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
          {chart.labels.map((item) => (
            <text key={`${item.x}-${item.label}`} x={item.x} y="246" textAnchor="middle" fontSize="11" fill="rgba(226,232,240,0.72)">
              {formatDateLabel(item.label)}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function getDurationOptions(section: DashboardSection): DurationValue[] {
  return section === "overview" ? ["12m"] : section === "insights" ? ["12m", "28d"] : ["28d"];
}

function getGeos(snapshot: DashboardSnapshot, section: DashboardSection, duration: DurationValue) {
  if (section === "overview") return snapshot.overviewMarkets.map((item) => item.region);
  if (section === "insights" && duration === "12m") return snapshot.overviewMarkets.map((item) => item.region);
  return snapshot.audienceMarkets.map((item) => item.region);
}

function findCard(cards: MetricCard[] | undefined, label: string) {
  return cards?.find((card) => card.label === label) ?? null;
}

function parseLabel(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const multiplier = normalized.endsWith("B") ? 1_000_000_000 : normalized.endsWith("M") ? 1_000_000 : normalized.endsWith("K") ? 1_000 : 1;
  const numeric = Number.parseFloat(normalized.replace(/[KMB%]/g, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : 0;
}

function getTopGrowthMarket(markets: OverviewMarket[]) {
  return [...markets]
    .map((market) => ({ region: market.region, delta: findCard(market.cards, "Streams")?.deltaValue ?? -Infinity }))
    .sort((left, right) => right.delta - left.delta)[0]?.region ?? "India";
}

function buildRecommendations(
  overview: OverviewMarket | null,
  audience: AudienceMarket | null,
  topGrowthMarket: string,
  sourceMix: SourceMixItem[],
) {
  const topCountry = audience?.topCountries?.[0]?.label ?? "your strongest market";
  const topCity = audience?.topCities?.[0]?.label ?? "your strongest city";
  const topSegment = titleCase(audience?.segments?.[0]?.segment ?? "super listeners");
  const leadRelease = audience?.releases?.[0]?.releaseName ?? "the lead release";
  const savesDelta = findCard(overview?.cards, "Saves")?.deltaLabel ?? "holding steady";
  const topSource = sourceMix[0]?.label ?? "active sources";

  return [
    `${topGrowthMarket} is the strongest growth market right now, making it the clearest place to concentrate the next campaign burst.`,
    `${topSegment} are the lead audience cohort. Build messaging that turns them into repeat listeners and profile visitors.`,
    `Use ${leadRelease} as the content anchor and start city-led creative in ${topCity} before broadening into ${topCountry}.`,
    `Saves are ${savesDelta}, while ${topSource} remains the leading discovery surface. Keep conversion-focused creative close to that behavior.`,
  ];
}

function buildAssistantReply(
  prompt: string,
  overview: OverviewMarket | null,
  audience: AudienceMarket | null,
  topGrowthMarket: string,
  topSource: string,
) {
  const question = prompt.toLowerCase();
  if (question.includes("city") || question.includes("tour")) {
    return `${audience?.topCities?.[0]?.label ?? "Your top city"} is the best next city signal. Start with a local test push there before scaling out.`;
  }
  if (question.includes("campaign") || question.includes("release") || question.includes("song")) {
    return `Center the next campaign around ${audience?.releases?.[0]?.releaseName ?? "the lead release"} and target ${topGrowthMarket} first, then retarget into your strongest city.`;
  }
  if (question.includes("audience") || question.includes("segment")) {
    return `${titleCase(audience?.segments?.[0]?.segment ?? "super listeners")} are the dominant audience group. Reward deeper fandom with save CTAs and repeat-listening hooks.`;
  }
  if (question.includes("save")) {
    return `Saves are ${findCard(overview?.cards, "Saves")?.deltaLabel ?? "stable"} in the current view. If you want stronger conversion, pull the call-to-action earlier in the creative.`;
  }
  return `${topGrowthMarket} is your clearest growth market and ${topSource} is the strongest discovery surface. That combination should drive your next action plan.`;
}

function buildLineChart(points: ChartPoint[]) {
  const maxValue = Math.max(...points.map((item) => item.value), 1);
  const usable = Math.max(points.length - 1, 1);
  const mapped = points.map((point, index) => ({
    ...point,
    x: 70 + (index / usable) * 594,
    y: 28 + (1 - point.value / maxValue) * 186,
  }));
  const linePath = mapped.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = mapped.length ? `${linePath} L ${mapped[mapped.length - 1]?.x ?? 664} 214 L ${mapped[0]?.x ?? 70} 214 Z` : "";
  const step = Math.max(Math.floor(mapped.length / 4), 1);
  const labels = mapped.filter((_, index) => index % step === 0 || index === mapped.length - 1);
  return { maxValue, points: mapped, linePath, areaPath, labels };
}

function axisValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return Math.round(value).toString();
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed);
  }
  const withYear = new Date(`${value}, 2026`);
  if (!Number.isNaN(withYear.getTime())) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(withYear);
  }
  return value;
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
