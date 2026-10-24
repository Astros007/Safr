# Verification — October 7, 2026

- Xcode 26.6: Debug iOS Simulator build succeeded without code signing.
- Installed and launched on iPhone 17 Pro / iOS 26.5 simulator.
- Visually confirmed bundled interface and live OpenFreeMap map tiles render.
- Native JavaScript bridge tests: GPS watch delivery/cancellation, Census estimated-address mapping, unavailable community API, screen-awake release/resume.
- Interactive simulator input was blocked by the desktop automation tool (`noWindowsAvailable`), so end-to-end address selection and routing were not verified in the simulator.
- Real iPhone GPS, spoken directions, network failures, and signing/distribution remain to be tested.

Run bridge tests: `node --test tests/native-bridge.test.cjs` from this folder.

## Physical-device startup fix — October 9, 2026
- Reproduced blank-screen failure on connected iPhone 14: asset containment check compared `/private/var` root against standardized `/var` file path and rejected index.html.
- Canonicalized both bundle root and requested file before containment checks; traversal protection retained.
- Added startup progress, timed failure/Retry UI, and bounded recovery after a web-content process termination.
- Signed device build succeeded, installed on iPhone 14, and launched. Device log confirmed the Safr document loaded successfully at 390 × 763 with visible body content and no navigation error.
