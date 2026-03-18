# Finland Flight Radar

A real-time flight tracking web application centered over Finland, utilizing the ADSB.lol API to render live airplane positions and flight details on an interactive map.

## Features

- **Live Flight Tracking**: Visualizes active flights over Finland in real-time.
- **Interactive Map**: Built with Leaflet.js, featuring a clean Carto light basemap.
- **Dynamic Aircraft Icons**: Plane markers dynamically rotate to match their true heading.
- **Flight Details Sidebar**: Click on any aircraft to view its callsign, origin country, barometric altitude, velocity, and heading in a sleek glassmorphism UI.
- **Auto-updating**: Flight data is polled and updated automatically every 10 seconds.

## Technologies Used

- **Frontend**: HTML5, Vanilla JavaScript (ES6), Custom CSS (with Glassmorphism design)
- **Map Library**: [Leaflet.js](https://leafletjs.com/)
- **Data Source**: [ADSB.lol](https://api.adsb.lol/) (fetched via a local Python proxy at `/api/flights` to handle CORS)
- **Fonts & Icons**: Google Fonts (Inter) and custom inline SVG icons.

## Prerequisites

To run this application, you must serve it through a local HTTP server that also acts as a proxy to the ADSB.lol API (to resolve CORS restrictions).

## How It Works

1. The application initializes a Leaflet map centered over Finland.
2. A transparent API call is made to the local proxy (`/api/flights`) every 10 seconds.
3. The response is parsed to extract active aircraft payloads (ICAO24 hex, callsign, latitude, longitude, track, ground speed, and altitude).
4. Leaflet markers (custom plane SVGs) are generated or updated with their current coordinates and headings.
5. If a marker is clicked, detailed flight metadata is passed to the sliding sidebar dashboard.
