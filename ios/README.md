# Safr for iPhone

The iPhone version puts the Safr website inside a SwiftUI app and adds native location support.

## Run it

1. Open `Safr.xcodeproj` in Xcode.
2. Choose the Safr scheme.
3. Pick an iPhone simulator or connected iPhone.
4. Press Run.

For a real iPhone, choose your development team in Signing & Capabilities and use your own bundle identifier.

## Files

- `Pathfinder/MapView.swift` loads the app and handles location.
- `Pathfinder/Web/` contains the website used by the iPhone app.
- `Pathfinder/native.js` connects JavaScript features to iOS.
- `scripts/sync-web-assets.py` copies updated website files into the Xcode project.

The app needs internet access for maps, address search, routes, road data, and weather.
