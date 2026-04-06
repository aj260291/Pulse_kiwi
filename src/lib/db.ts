import { Pool, type QueryResultRow } from "pg";

const rawConnectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  "postgresql://abhishekjha@localhost:5432/archive_csvs";

const normalizedConnectionUrl = new URL(rawConnectionString);
normalizedConnectionUrl.search = "";

const connectionString = normalizedConnectionUrl.toString();
const usesRemoteDatabase =
  !/(localhost|127\.0\.0\.1)/i.test(normalizedConnectionUrl.hostname);

const globalForPg = globalThis as typeof globalThis & {
  __pulseArchivePool?: Pool;
};

const poolConfig = usesRemoteDatabase
  ? {
      host: normalizedConnectionUrl.hostname,
      port: Number(normalizedConnectionUrl.port || 5432),
      user: decodeURIComponent(normalizedConnectionUrl.username),
      password: decodeURIComponent(normalizedConnectionUrl.password),
      database: normalizedConnectionUrl.pathname.replace(/^\//, ""),
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }
  : {
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    };

export const pool = globalForPg.__pulseArchivePool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForPg.__pulseArchivePool = pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<T>(text, params);
}

export function assertSafeIdentifier(identifier: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error("Unsafe SQL identifier requested.");
  }

  return identifier;
}

export function quoteIdentifier(identifier: string) {
  const safe = assertSafeIdentifier(identifier);
  return `"${safe.replace(/"/g, '""')}"`;
}
