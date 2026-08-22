# NARW Council — frontend

React + Vite app for the researcher-in-the-field flow: record/upload a clip, get a council
verdict with confidence tiers, see the detection on a Mapbox map against nearby fleet zones,
and send a simulated notify.

This talks to the FastAPI backend in the repo root (`/classify`, `/health`) — see that
service's README for how to run/deploy it.

## Setup

```
npm install
cp .env.example .env
```

Fill in `.env`:
- `VITE_API_BASE_URL` — the backend URL (local `http://localhost:8000`, or the deployed Render URL)
- `VITE_MAPBOX_TOKEN` — a free Mapbox access token (https://account.mapbox.com/access-tokens/). Without this, the map panel shows a setup message instead of crashing.

## Run

```
npm run dev
```

## Notes

- Detection location comes from browser geolocation; if denied/unavailable it falls back to a
  fixed Bay of Fundy point (`src/data/fisheries.js`).
- Fleet zones and the proximity radius (`src/data/fisheries.js`) are illustrative placeholders
  for the demo, not real DMA/NOAA/DFO contact data.
- The notify button is simulated only — it never contacts anything, per project scope.
