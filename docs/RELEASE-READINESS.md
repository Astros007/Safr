# Pathfinder 1.0 release candidate

## Delivered
- Consistent blue-and-white walking/cycling interface and compact route comparison.
- Whole-number search zoom normalization prevents HTTP 400 errors after map zoom/route fitting.
- Nearby place search, broader full-address lookup, US Census address estimates, retry/backoff, and canceled-search handling.
- Profile-specific road-exposure ranking with clear missing-data states; crime is not used.
- GPS start cancellation, protection against late GPS/watch callbacks after cancellation, stale/low-accuracy GPS handling, and screen-wake handling.
- Offline status and disabled network-dependent workflows while disconnected.
- Tunnel access notices, directions, voice controls, weather, user hazard reports, and help/privacy explanations.

## Verification
33 automated tests cover search recovery/rate limits/cancellation, address conversion, API write authorization, profile scoring, accessible-route exclusions, route caching, exposure comparisons, stale GPS, tunnel notices, and navigation startup cancellation. Navigation lifecycle tests exercise extracted production functions with simulated GPS and screen-lock promises; they are not field tests.
Browser checks cover place and address selection, walking/cycling routes, route selection, details, settings/help, and layout inspection. Actual outdoor navigation on iOS and Android has not been field-verified.

## Required before a broad consumer launch
1. Decide public sharing. The hosted app remains owner-private until the owner authorizes broader access. Opening access also opens existing hazard reports to that audience.
2. Choose supported production search/routing capacity. Photon explicitly describes its public endpoint as a demo with possible throttling and no availability guarantee: https://github.com/komoot/photon#demo-server. Routing currently uses a public Valhalla endpoint; no service commitment is configured. Retries do not replace operational capacity.
3. If commercial, configure a licensed weather service. Open-Meteo's free API is for noncommercial use with rate limits: https://open-meteo.com/en/terms. No paid subscription or provider account has been purchased or configured.
4. Field-test representative walking/cycling routes on real phones: GPS permission denial, weak GPS, tunnels, intersection guidance, off-route recovery, arrival, stopping, screen locking and returning from the background. Confirm actual public access and hours on tunnel routes.
5. Validate the safety model against local route observations. Percentages are relative exposure scores, not proven injury-risk reductions. Map coverage, sidewalk continuity and curb access remain incomplete.
6. Establish a support contact and a process for reviewing community hazard reports before inviting a broad public audience. Current reports are unverified and authenticated users can submit/withdraw their own reports.

## Runtime limitations
An open browser page and connectivity are required for dependable operation. This is not offline navigation and background GPS cannot be promised. No trip history is persisted by the app. External search/routing/weather services receive the relevant query or location; provider retention policies apply. App privacy and source explanations are in Settings.
