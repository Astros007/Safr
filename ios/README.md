# Safr for iPhone and iPad

## Open and run
1. Open **Safr.xcodeproj** in Xcode (17.0+ iOS deployment target; built with Xcode 26.6).
2. Choose the **Safr** scheme and an iPhone simulator.
3. Press **Run** (⌘R). No npm install or XcodeGen is needed to open the supplied project.

### Run on your iPhone
Connect your phone, select it as the destination, then select the Safr target → Signing & Capabilities. Choose your Apple development team and replace `com.example.pathfinder` with your own unique bundle identifier. Enable Developer Mode on the phone if Xcode requests it. Run and allow location when you choose “Use my location.”

## What is included
- The current Safr blue-and-white web interface bundled inside a SwiftUI / WKWebView iOS application. This is a hybrid app, not a full SwiftUI rewrite.
- Walking/cycling search, route comparison, map, weather, existing safety assessment, and foreground guidance.
- Native Core Location, permission handling, and screen-awake behavior during navigation.
- Native US Census address lookup; no website login needed for search or routes.
- Locally stored preferences and bundled map libraries.

## Important limitations
Internet access is required for map tiles, search, routing, road data and weather. The bundled interface does not provide offline navigation. Public data providers can be slow or unavailable and have usage policies; arrange suitable service capacity before a broad consumer release.

Navigation works while the app is open. It does not provide background or lock-screen navigation. Test GPS, spoken directions, accuracy loss, permissions and battery use on a real iPhone before distributing it.

Shared community reports are **not connected** in this package. The website uses a signed-in server and database that cannot be bundled inside an iOS app. The mobile assessment treats reports as unavailable; it does not claim an empty report set means no hazards. Add a mobile-authenticated backend before enabling reporting.

Safety comparisons remain estimates of road exposure among assessed route alternatives, not measured crash-risk reductions or guarantees of safety.

This package is ready to open and develop in Xcode. It is not an App Store submission: configure signing, supply final app icons, review privacy disclosures and provider terms, and perform device testing before TestFlight/App Store release.

## Files
- `Pathfinder/MapView.swift`: web container, local asset loader, Core Location and Census bridge.
- `Pathfinder/native.js`: native integration for the existing JavaScript UI.
- `Pathfinder/Web/`: bundled website assets; editable directly.
- `project.yml`: optional XcodeGen source for regenerating the project.
- `scripts/sync-web-assets.py`: refresh assets from adjacent `saferoute/public` and apply mobile adaptations. Run from any directory with Python 3. The website itself is not changed.

## Privacy
No trip history or analytics is added by the iOS wrapper. Location is requested only when needed. GPS stays in memory except coordinates used for requested routing/rerouting. Search terms go to Photon and, for numbered US addresses, Census. Routing endpoints/shapes go to Valhalla; geographic areas go to the map, weather and local road-data providers identified in Help & privacy. Preferences are saved locally. HTTPS certificate validation remains enabled.
