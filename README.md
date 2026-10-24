# Safr

Safr is a walking and biking navigation app that focuses on road safety. It compares route options and recommends the one with less exposure to fast roads and major crossings. It also shows how the safer route compares with the quickest route.

## Features

- Walking and biking directions
- Safer route and quickest route comparison
- Major crossing and road exposure estimates
- Address search and current location
- Turn-by-turn directions with voice guidance
- Weather, daylight, and reported hazard checks
- Accessibility profiles

## How it works

Safr gets several possible routes and breaks them into smaller street sections. Each section is scored using available details such as road type, speed, crossings, sidewalks, bike lanes, lighting, and hazards. The app combines those scores and recommends the route with the lowest estimated road exposure.

Safety scores are estimates based on available map data. They help compare routes but cannot guarantee that a route is hazard-free.

## Run the website

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

The local site usually opens at `http://localhost:4174`.

To run the tests:

```bash
npm test
```

## Run the iPhone app

Open `ios/Safr.xcodeproj` in Xcode, choose an iPhone or simulator, and press Run.

## Main tools

- JavaScript, HTML, and CSS
- Swift and WebKit
- Cloudflare Workers
- OpenStreetMap and Valhalla
- Drizzle ORM

Made by Sahi Adhikari.
