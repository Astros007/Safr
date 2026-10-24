# Safr

I made Safr because the fastest walking or biking route is not always the safest one. A route can save a minute while sending someone across a busy intersection or onto a road with fast-moving cars.

Safr looks for route options and recommends the one with the lowest estimated traffic exposure. It also compares that route with the quickest option so the user can see what the extra time gives them, such as fewer major crossings or more distance on mapped paths.

## Main features

- Walking and cycling directions
- Route ranking based on traffic safety
- Comparison with the quickest route
- Address search and current-location support
- Turn-by-turn navigation and voice directions
- Profiles for different accessibility needs
- Reports for lighting, sidewalk, construction, and other hazards
- Daylight and weather checks when the data is available

## Route scoring

Safr splits each route into street segments and scores the conditions on each one. The score can use road type, estimated speed, major crossings, sidewalks, bike infrastructure, lighting, crash-risk data, and temporary hazards. The segment scores are combined to compare the complete routes.

The safety numbers are estimates based on the map and local data that are available. They are meant to help users compare routes, not guarantee that a route has no hazards.

## Built with

- JavaScript, HTML, and CSS
- Swift and WebKit for iOS
- Cloudflare Workers
- OpenStreetMap
- Valhalla routing
- Drizzle ORM

## Run the web app

Install Node.js 20 or newer, then run:

```bash
npm install
npm run dev
```

Wrangler will print the local address, usually `http://localhost:4174`.

Run the web tests with:

```bash
npm test
```

## Open the iOS app

Open `ios/Safr.xcodeproj` in Xcode, choose an iPhone or simulator, and press Run.

## Folders

- `public/` contains the web interface and navigation code.
- `server/` contains the worker, search, and data code.
- `db/` and `drizzle/` contain the database schema and migration.
- `tests/` contains the web tests.
- `ios/` contains the Xcode project and iPhone version.

Created by Sahi Adhikari for the Congressional App Challenge.
