export type MetricCard = {
  label: string;
  valueLabel: string;
  deltaLabel: string;
  deltaValue: number | null;
  statsPeriod: string;
  region: string;
  timeline: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type MetricSeries = {
  label: string;
  latestValue: number;
  points: ChartPoint[];
};

export type OverviewMarket = {
  region: string;
  timeline: string;
  statsPeriod: string;
  spotifyPageUrl: string | null;
  cards: MetricCard[];
  series: MetricSeries[];
};

export type SourceMixItem = {
  label: string;
  listeners: number;
};

export type GenderBreakdownItem = {
  gender: string;
  percent: number;
  listeners: number;
};

export type AgeBreakdownItem = {
  ageRange: string;
  percentOfListeners: number;
  female: number;
  male: number;
  nonBinary: number;
  notSpecified: number;
  totalListeners: number;
};

export type AudienceSegmentItem = {
  segment: string;
  percent: number;
  buttonText: string;
};

export type RankedLocation = {
  rank: number;
  label: string;
  listeners: number;
  activePercent: number | null;
  activeListeners: number | null;
};

export type ReleaseStat = {
  releaseName: string;
  toggle: string;
  peakValue: number;
  points: ChartPoint[];
};

export type AudienceMarket = {
  region: string;
  timeline: string;
  genders: GenderBreakdownItem[];
  ages: AgeBreakdownItem[];
  segments: AudienceSegmentItem[];
  topCountries: RankedLocation[];
  topCities: RankedLocation[];
  releases: ReleaseStat[];
};

export type DashboardSnapshot = {
  artistName: string;
  artistUrl: string | null;
  overviewMarkets: OverviewMarket[];
  audienceMarkets: AudienceMarket[];
  sourceMix: SourceMixItem[];
};
