import { query, quoteIdentifier } from "@/lib/db";
import type {
  AgeBreakdownItem,
  AudienceMarket,
  AudienceSegmentItem,
  DashboardSnapshot,
  GenderBreakdownItem,
  MetricCard,
  MetricSeries,
  OverviewMarket,
  RankedLocation,
  ReleaseStat,
  SourceMixItem,
} from "@/lib/types";

type RawRow = Record<string, string | null>;

const OVERVIEW_METRICS_PATH =
  "audience/dashboard_data/xavier_top_floor/overview_metrics.csv";
const SOURCE_MIX_PATH =
  "audience/dashboard_data/xavier_top_floor/source_mix_latest.csv";
const AGE_BREAKDOWN_PATH =
  "audience/dashboard_data/xavier_top_floor/demographics_age.csv";
const GENDER_BREAKDOWN_PATH =
  "audience/dashboard_data/xavier_top_floor/demographics_gender.csv";
const AUDIENCE_SEGMENTS_PATH =
  "audience/dashboard_data/xavier_top_floor/audience_segments.csv";
const TOP_COUNTRIES_PATH =
  "audience/dashboard_data/xavier_top_floor/location_top_countries.csv";
const TOP_CITIES_PATH =
  "audience/dashboard_data/xavier_top_floor/location_top_cities.csv";
const RELEASE_SUMMARY_PATH =
  "audience/dashboard_data/xavier_top_floor/release_summary.csv";
const RELEASE_ENGAGEMENT_PATH =
  "audience/dashboard_data/xavier_top_floor/release_engagement.csv";

const REGION_CHART_PATTERNS = [
  {
    region: "Worldwide",
    summaryPattern:
      "audience/output/xavier_top_floor/12m__worldwide__%/summary.csv",
    chartPattern:
      "audience/output/xavier_top_floor/12m__worldwide__%/chart_points.csv",
  },
  {
    region: "United States",
    summaryPattern:
      "audience/output/xavier_top_floor/12m__united_states__%/summary.csv",
    chartPattern:
      "audience/output/xavier_top_floor/12m__united_states__%/chart_points.csv",
  },
  {
    region: "India",
    summaryPattern: "audience/output/xavier_top_floor/12m__india__%/summary.csv",
    chartPattern: "audience/output/xavier_top_floor/12m__india__%/chart_points.csv",
  },
  {
    region: "Canada",
    summaryPattern: "audience/output/xavier_top_floor/12m__canada__%/summary.csv",
    chartPattern: "audience/output/xavier_top_floor/12m__canada__%/chart_points.csv",
  },
] as const;

const metricOrder = [
  "Listeners",
  "Streams",
  "Saves",
  "Followers",
  "Monthly active listeners",
  "Playlist adds",
  "Streams / Listener",
];

const ageOrder = ["<18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function parseNumeric(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const normalized = value.replace(/,/g, "").trim();
  const multiplier = normalized.endsWith("B")
    ? 1_000_000_000
    : normalized.endsWith("M")
      ? 1_000_000
      : normalized.endsWith("K")
        ? 1_000
        : 1;

  const numeric = parseFloat(normalized.replace(/[KMB%]/g, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : 0;
}

function parsePercent(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  return parseNumeric(value.replace("%", ""));
}

function compareLabelsByDate(left: string, right: string) {
  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);

  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }

  const leftWithYear = Date.parse(`${left}, 2026`);
  const rightWithYear = Date.parse(`${right}, 2026`);

  if (!Number.isNaN(leftWithYear) && !Number.isNaN(rightWithYear)) {
    return leftWithYear - rightWithYear;
  }

  return left.localeCompare(right);
}

function groupBy<T>(items: T[], keySelector: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = keySelector(item);
    accumulator[key] ??= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

async function resolveTableName({
  exactPath,
  likePattern,
}: {
  exactPath?: string;
  likePattern?: string;
}) {
  if (!exactPath && !likePattern) {
    throw new Error("A manifest lookup path is required.");
  }

  const useLike = Boolean(likePattern);
  const predicate = useLike ? "relative_path LIKE $1" : "relative_path = $1";
  const value = likePattern ?? exactPath;

  const { rows } = await query<{ table_name: string }>(
    `
      SELECT table_name
      FROM csv_import_manifest
      WHERE status = 'success' AND ${predicate}
      ORDER BY relative_path DESC
      LIMIT 1
    `,
    [value],
  );

  return rows[0]?.table_name ?? null;
}

async function loadRows({
  exactPath,
  likePattern,
}: {
  exactPath?: string;
  likePattern?: string;
}): Promise<RawRow[]> {
  const tableName = await resolveTableName({ exactPath, likePattern });
  if (!tableName) {
    return [];
  }

  const { rows } = await query<RawRow>(`SELECT * FROM ${quoteIdentifier(tableName)}`);
  return rows;
}

function buildOverviewCards(rows: RawRow[]): MetricCard[] {
  const grouped = groupBy(rows, (row) => row.metric ?? "metric");

  return metricOrder
    .map((metric) => grouped[metric]?.[0])
    .filter((row): row is RawRow => Boolean(row))
    .map((row) => ({
      label: row.metric ?? "Metric",
      valueLabel: row.current ?? "0",
      deltaLabel: row.delta ?? "0%",
      deltaValue: row.delta ? parsePercent(row.delta) : null,
      statsPeriod: row.stats_period ?? "",
      region: row.region ?? "",
      timeline: row.timeline ?? "",
    }));
}

function buildSeries(rows: RawRow[]): MetricSeries[] {
  const grouped = groupBy(rows, (row) => row.tile_name ?? "metric");

  return metricOrder
    .map((metric) => ({ metric, rows: grouped[metric] ?? [] }))
    .filter(({ rows: metricRows }) => metricRows.length > 0)
    .map(({ metric, rows: metricRows }) => {
      const points = metricRows
        .map((row) => ({
          label: row.point_date ?? "",
          value: parseNumeric(row.point_value),
        }))
        .sort((left, right) => compareLabelsByDate(left.label, right.label));

      return {
        label: metric,
        latestValue: points[points.length - 1]?.value ?? 0,
        points,
      };
    });
}

function buildSourceMix(rows: RawRow[]): SourceMixItem[] {
  return rows
    .map((row) => ({
      label: row.source_label ?? "Unknown",
      listeners: parseNumeric(row.listeners),
    }))
    .sort((left, right) => right.listeners - left.listeners);
}

function buildGenderBreakdown(rows: RawRow[]): GenderBreakdownItem[] {
  return rows
    .map((row) => ({
      gender: row.gender ?? "Unknown",
      percent: parsePercent(row.percent),
      listeners: parseNumeric(row.listeners),
    }))
    .sort((left, right) => right.listeners - left.listeners);
}

function buildAgeBreakdown(rows: RawRow[]): AgeBreakdownItem[] {
  return rows
    .map((row) => {
      const female = parseNumeric(row.female);
      const male = parseNumeric(row.male);
      const nonBinary = parseNumeric(row.non_binary);
      const notSpecified = parseNumeric(row.not_specified);

      return {
        ageRange: row.age_range ?? "Unknown",
        percentOfListeners: parsePercent(row.percent_of_listeners),
        female,
        male,
        nonBinary,
        notSpecified,
        totalListeners: female + male + nonBinary + notSpecified,
      };
    })
    .sort(
      (left, right) => ageOrder.indexOf(left.ageRange) - ageOrder.indexOf(right.ageRange),
    );
}

function buildAudienceSegments(rows: RawRow[]): AudienceSegmentItem[] {
  return rows
    .map((row) => ({
      segment: row.segment ?? "Unknown",
      percent: parsePercent(row.percent),
      buttonText: row.button_text ?? "",
    }))
    .sort((left, right) => right.percent - left.percent);
}

function buildLocations(rows: RawRow[], labelField: "country" | "city"): RankedLocation[] {
  return rows
    .map((row) => ({
      rank: parseNumeric(row.rank),
      label: row[labelField] ?? "Unknown",
      listeners: parseNumeric(row.listeners),
      activePercent: row.active_percent ? parsePercent(row.active_percent) : null,
      activeListeners: row.active_listeners ? parseNumeric(row.active_listeners) : null,
    }))
    .sort((left, right) => left.rank - right.rank);
}

function buildReleaseStats(summaryRows: RawRow[], engagementRows: RawRow[]): ReleaseStat[] {
  const engagementGroups = groupBy(
    engagementRows,
    (row) => `${row.release_name ?? "Release"}__${row.toggle ?? "Metric"}`,
  );

  return summaryRows.map((row) => {
    const key = `${row.release_name ?? "Release"}__${row.toggle ?? "Metric"}`;
    const points = (engagementGroups[key] ?? [])
      .map((point) => ({
        label: point.date ?? "",
        value: parseNumeric(point.value),
      }))
      .sort((left, right) => compareLabelsByDate(left.label, right.label));

    return {
      releaseName: row.release_name ?? "Release",
      toggle: row.toggle ?? "Metric",
      peakValue: parseNumeric(row.peak_value),
      points,
    };
  });
}

async function getOverviewMarkets() {
  const [overviewMetricRows, regionOutputRows] = await Promise.all([
    loadRows({ exactPath: OVERVIEW_METRICS_PATH }),
    Promise.all(
      REGION_CHART_PATTERNS.map(async ({ region, summaryPattern, chartPattern }) => ({
        region,
        summaryRows: await loadRows({ likePattern: summaryPattern }),
        chartRows: await loadRows({ likePattern: chartPattern }),
      })),
    ),
  ]);

  const metricsByRegion = groupBy(overviewMetricRows, (row) => row.region ?? "Unknown");

  return regionOutputRows
    .map(({ region, summaryRows, chartRows }) => {
      const cards = buildOverviewCards(metricsByRegion[region] ?? []);
      const firstSummaryRow = summaryRows[0] ?? null;
      const timeline = cards[0]?.timeline ?? firstSummaryRow?.timeline ?? "12m";
      const statsPeriod = cards[0]?.statsPeriod ?? firstSummaryRow?.stats_period_line ?? "";

      return {
        region,
        timeline,
        statsPeriod,
        spotifyPageUrl: firstSummaryRow?.page_url ?? null,
        cards,
        series: buildSeries(chartRows.filter((row) => (row.region ?? region) === region)),
      } satisfies OverviewMarket;
    })
    .filter((market) => market.cards.length > 0);
}

async function getAudienceMarkets() {
  const [ageRows, genderRows, segmentRows, countryRows, cityRows, releaseSummaryRows, releaseEngagementRows] =
    await Promise.all([
      loadRows({ exactPath: AGE_BREAKDOWN_PATH }),
      loadRows({ exactPath: GENDER_BREAKDOWN_PATH }),
      loadRows({ exactPath: AUDIENCE_SEGMENTS_PATH }),
      loadRows({ exactPath: TOP_COUNTRIES_PATH }),
      loadRows({ exactPath: TOP_CITIES_PATH }),
      loadRows({ exactPath: RELEASE_SUMMARY_PATH }),
      loadRows({ exactPath: RELEASE_ENGAGEMENT_PATH }),
    ]);

  const regions = Array.from(
    new Set([
      ...ageRows.map((row) => row.region ?? ""),
      ...genderRows.map((row) => row.region ?? ""),
      ...segmentRows.map((row) => row.region ?? ""),
    ].filter(Boolean)),
  );

  return regions.map((region) => ({
    region,
    timeline: "28d",
    genders: buildGenderBreakdown(genderRows.filter((row) => row.region === region)),
    ages: buildAgeBreakdown(ageRows.filter((row) => row.region === region)),
    segments: buildAudienceSegments(segmentRows.filter((row) => row.region === region)),
    topCountries: buildLocations(countryRows.filter((row) => row.region === region), "country"),
    topCities: buildLocations(cityRows.filter((row) => row.region === region), "city"),
    releases: buildReleaseStats(
      releaseSummaryRows.filter((row) => row.region === region),
      releaseEngagementRows.filter((row) => row.region === region),
    ),
  } satisfies AudienceMarket));
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [overviewMarkets, audienceMarkets, sourceMixRows] = await Promise.all([
    getOverviewMarkets(),
    getAudienceMarkets(),
    loadRows({ exactPath: SOURCE_MIX_PATH }),
  ]);

  const artistName = overviewMarkets[0]?.cards[0]?.region
    ? "Xavier Top Floor"
    : "Xavier Top Floor";

  const artistUrl = overviewMarkets[0]?.spotifyPageUrl ?? null;

  return {
    artistName,
    artistUrl,
    overviewMarkets,
    audienceMarkets,
    sourceMix: buildSourceMix(sourceMixRows),
  };
}
