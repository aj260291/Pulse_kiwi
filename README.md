# Pulse Archive App

Pulse Archive is a contextual, Spotify-for-Artists-style dashboard built on top of the local PostgreSQL database `archive_csvs`.

## What it shows
- Artist-level performance overview for **Xavier Top Floor**
- 12M overview metrics by market
- Trend charts for listeners, streams, saves, and followers
- 28D audience breakdowns for available regions
- Gender and age distribution
- Audience segments
- Top countries and cities
- Release spotlight metrics
- Source mix summary
- Data storage provenance

## Data storage
The dashboard reads from the local PostgreSQL database:

- Database: `archive_csvs`
- Host: `localhost`
- Port: `5432`

The source CSVs were imported from:

- `/Users/abhishekjha/Documents/Github/Archive/collected_csvs`

## Run locally
```bash
cd /Users/abhishekjha/Documents/Github/Archive/pulse_archive_app
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production mode
```bash
cd /Users/abhishekjha/Documents/Github/Archive/pulse_archive_app
npm run build
npm run start
```
