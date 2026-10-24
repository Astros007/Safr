# Context-aware safety additions

- Existing per-profile road-exposure scoring remains the ranking basis. Fast roads (35 mph+) with no mapped protection get a 1.5x multiplier. A shared bicycle lane no longer receives a separation discount; dedicated and separated facilities retain their existing discounts.
- NOAA fractional-year solar equations estimate whether any sampled portion of a trip is after sunset. Sampling is every approximately five minutes along estimated progress. If any part includes darkness, the whole route conservatively receives night lighting weights. Mapped unlit penalties are 3x the original profile lighting weight at night and zero during daylight. Unknown lighting remains explicitly unknown. Twilight, obstructions and actual lamp operation are not measured.
- A change from a daytime assessment to darkness during navigation prompts a spoken reminder to stop and recompare via Safety tools. It does not silently reroute onto higher-speed streets.
- Amber overlays identify mapped missing sidewalks, steps, or unlit segments during a night trip. Blue identifies the selected route. Neither color guarantees safety.
- Safety tools include an iPhone location share sheet (snapshot only), four private hazard-note types, clear-notes and route comparison actions. Notes expire in 24 hours, are capped at 100 and deduplicated by type and approximate 40m cell. Notes are stored only on this device and feed into subsequent assessments near the reported point. Shared reports remain unavailable.
- Sharing requires a fresh, reasonably accurate location and explicit user selection of a recipient/app in the iPhone share sheet. No contact is messaged automatically. Safr does not implement emergency dispatch or live tracking.
- Crime, business hours, CPTED activity indicators and verified community reports are not integrated. Do not advertise these as implemented.

Solar reference: https://gml.noaa.gov/grad/solcalc/solareqns.PDF

Verification: tests cover Houston day/night, a sunset-spanning trip, lighting unknowns, note expiry/deduplication/deletion, and shared vs separated lane scoring. Native build checks the sharing bridge. Real recipient sharing and outdoor navigation are not exercised by automated tests.
