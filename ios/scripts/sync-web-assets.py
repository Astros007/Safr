#!/usr/bin/env python3
"""Refresh bundled assets from the adjacent website without modifying the website."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
source = root.parent / 'saferoute' / 'public'
target = root / 'Pathfinder' / 'Web'
if not source.is_dir():
    raise SystemExit('Place this project beside the saferoute folder before syncing. Bundled assets already work without it.')
shutil.rmtree(target, ignore_errors=True)
shutil.copytree(source, target)
p = target / 'app.js'
s = p.read_text().replace('Allow location in your browser settings', 'Allow location in iPhone Settings → Pathfinder')
s = s.replace("const community=initCommunity({map,L,state,toast,onChanged:()=>{if(!state.nav)invalidateRoutes()}});", "const community={selectPoint:()=>toast('Shared hazard reports are not connected in this iPhone version.')}; $('community-open').hidden=true;")
p.write_text(s)
p = target / 'index.html'
s = p.read_text().replace('Keep the page open and your screen on for GPS directions.', 'Keep Pathfinder open for GPS directions. Navigation pauses when you leave the app or lock your phone.')
s = s.replace('update the browser’s site permissions', 'open iPhone Settings → Pathfinder → Location')
s = s.replace('Directions cannot reliably continue when the browser is in the background.', 'Navigation is available while Pathfinder is open; background navigation is not supported.')
s = s.replace('Reports you submit are shared with people who can access the app. You can withdraw your reports from their map pins.', 'Shared hazard reports are not connected in this iPhone version.')
s = s.replace('Community reports store the hazard point you select and your note, associated with your signed-in account; your account identifier is not shown on the community map.', 'Shared hazard reports are not connected in this iPhone version.')
s = s.replace('GPS guidance works while this page is open. Keep your screen on; browser navigation may pause in the background.', 'GPS guidance works while Pathfinder is open. Navigation pauses in the background.')
s = s.replace('House-number searches also go through Pathfinder to the US Census address service', 'House-number searches go directly to the US Census address service')
s = s.replace('Pathfinder · Release 1.0 candidate', 'Pathfinder for iPhone · 1.0')
p.write_text(s.replace('content="#007aff"', 'content="#ff6b1f"'))
print('Refreshed iOS web assets.')
# MapLibre's worker cannot request our app-only URL scheme. Pass the bundled style directly.
p = target / 'map-kit.js'
p.write_text(p.read_text().replace("style:'map-style.json'", "style:" + (target / 'map-style.json').read_text()))
p = target / 'final-theme.css'
p.write_text(p.read_text() + '\n@media(max-width:900px){.map-controls{bottom:auto!important;gap:8px}.planner{max-height:62dvh}}\n')

# Apply the iOS app name after syncing the website.
for p in [*target.glob("*.html"), *target.glob("*.js")]:
    p.write_text(p.read_text().replace("Pathfinder", "Safr"))

# Preserve the iPhone presentation separately from the website.
for name in ['phone.css', 'phone.js']:
    shutil.copy2(root / 'Mobile' / name, target / name)
shutil.copy2(root / 'Mobile' / 'safr-mark-transparent.png', target / 'safr-mark-transparent.png')
p = target / 'index.html'
s = p.read_text().replace('</head>', '<link rel="stylesheet" href="phone.css"></head>').replace('</body>', '<script type="module" src="phone.js"></script></body>')
s = s.replace('<span class="brandmark"><svg><use href="#i-route"/></svg></span>', '<span class="brandmark"><img src="safr-mark-transparent.png" alt=""></span>')
s = s.replace('href="favicon.svg"', 'href="safr-mark-transparent.png"').replace('href="safr-logo.svg"', 'href="safr-mark-transparent.png"')
p.write_text(s)
shutil.copy2(root / 'Mobile' / 'directions.js', target / 'directions.js')
p = target / 'app.js'
s = p.read_text()
s = s.replace('query.length<3', 'query.length<2').replace('value.trim().length>=3', 'value.trim().length>=2').replace('searchPlaces(which),650', 'searchPlaces(which),300')
s = s.replace('if(metersBetween(state.gps.coords,state.routes[state.selected].points[0])>100){', 'if(!window.safrKeepSelectedStart&&metersBetween(state.gps.coords,state.routes[state.selected].points[0])>100){')
s = s.replace("map.flyTo(state.gps.coords,17,{duration:.7})", "map.flyTo(window.safrKeepSelectedStart?state.routes[state.selected].points[0]:state.gps.coords,17,{duration:.7})")
s = s.replace('if(projected.distance>Math.max(40,gps.accuracy*1.5)){state.offRouteCount++;', "if(projected.distance>Math.max(40,gps.accuracy*1.5)){if(window.safrKeepSelectedStart){state.offRouteCount=0;const tripSeconds=route.summary.time,tripDistance=route.distances.at(-1);$('nav-distance').textContent='Go to the route start';$('nav-instruction').textContent='Navigation begins at your selected location';$('nav-next').textContent='End navigation to choose a different starting point.';$('nav-minutes').textContent=`${minutes(tripSeconds)} min`;$('nav-remaining').textContent=`${formatDistance(tripDistance)} · from selected start`;return}state.offRouteCount++;")
start = s.index('function showDirections(){')
end = s.index('\n', start)
s = "import {renderDirections} from './directions.js';\n" + s[:start] + "function showDirections(){const r=state.routes[state.selected];if(!r)return;renderDirections({route:r,origin:state.origin,destination:state.destination,mode:state.mode,distance:formatDistance,minutes,arrow:turnArrow,onStart:startNavigation,onMap:()=>fitRoutes(true)})}" + s[end:]
p.write_text(s)
# Context-aware mobile routing and private safety tools.
for name in ['environment-safety.js', 'safety-tools.js']:
    shutil.copy2(root / 'Mobile' / name, target / name)
p = target / 'profile-safety.js'
s = "import {readNotes} from './environment-safety.js';\n" + p.read_text()
s = s.replace('reports:context.reports||[]', 'reports:[...(context.reports||[]),...readNotes()]')
s = s.replace('usedReports,usedCurbs){', 'usedReports,usedCurbs,night=false){')
s = s.replace('if(unlit)score+=length/100*weights.unlit;', 'if(unlit&&night)score+=length/100*weights.unlit*3;')
s = s.replace('lighting:weights.unlit,', 'lighting:night?weights.unlit*3:0,')
s = s.replace('reports.length,tags,profile', 'reports.length,tags,profile')
p.write_text(s)
p = target / 'traffic-safety.js'
s = "import {darkDuringTrip} from './environment-safety.js';\n" + p.read_text()
s = s.replace('const junctions=[];', 'result.night=darkDuringTrip(route.points,route.summary.time,prefs.departureTime||Date.now());\n  const junctions=[];')
s = s.replace("mode==='bicycle'&&['dedicated','shared'].includes(e.cycle_lane)?.7:1", "mode==='bicycle'&&e.cycle_lane==='dedicated'?.7:1")
s = s.replace('usedReports,usedCurbs);','usedReports,usedCurbs,result.night);')
s = s.replace('edgeScore*=weights.speed;', "if(isRoad&&speed>=56.3&&protectedFactor===1)edgeScore*=1.5;\n    edgeScore*=weights.speed;")
p.write_text(s)
p = target / 'app.js'
s = "import {installSafetyTools} from './safety-tools.js';\n" + p.read_text()
s = s.replace("color=i===0?'#007aff':'#97a5b8'", "color=i===0?'#ff6b1f':'#a89b91'")
s += "\ninstallSafetyTools({state,getPosition,receiveGPS,toast,speak,recheck:()=>findRoutes({reroute:state.nav})});\n"
s = s.replace("const total=Math.max(1,a.totalMeters),pct=", "const total=Math.max(1,a.totalMeters),pct=")
s = s.replace('<summary>Map coverage</summary>', '<summary>Map coverage</summary><p>${a.night?\'Trip includes darkness: extra weight for mapped unlit segments.\':\'Daylight trip: no lighting penalty.\'}</p>')
s = s.replace('nearby community observations included.', 'nearby observations included (including private notes).')
p.write_text(s)
p = target / 'index.html'
s = p.read_text().replace('Mapped unlit streets add 0.8–2.', 'Mapped unlit streets add 2.4–6 when the trip includes darkness.').replace('mapped unlit streets add 0.8–2.', 'mapped unlit streets add 2.4–6 when the trip includes darkness.')
s = s.replace('Coefficients are design choices,', 'Unprotected fast-road exposure is multiplied by 1.5; a shared bike lane receives no separation discount. Private hazard notes expire after 24 hours. Night is estimated from solar position over the trip. Crime and business-activity data are not included. Coefficients are design choices,')
p.write_text(s)
p = target / 'profile-safety.js'
p.write_text(p.read_text().replace("[r.kind]||2)", "[r.kind]??2)"))
p = target / 'traffic-safety.js'
s = p.read_text().replace('const segment={name:', 'const segment={begin:e.begin_shape_index,end:e.end_shape_index,name:')
p.write_text(s)
p = target / 'app.js'
s = p.read_text().replace("    if(!state.nav)L.tooltip", "    if(selected&&r.assessment)for(const segment of r.assessment.segments){if(segment.sidewalk==='missing'||segment.steps||(r.assessment.night&&segment.lighting==='mapped unlit'))L.polyline(segment.points,{color:'#df920a',weight:4,opacity:1}).addTo(routeGroup)}\n    if(!state.nav)L.tooltip")
s = s.replace("${target.verbal_pre_transition_instruction||target.instruction}`)", "${target.verbal_pre_transition_instruction||target.instruction}${route.assessment?.night&&route.assessment.segments.some(s=>s.begin<=target.begin_shape_index&&s.end>target.begin_shape_index&&s.lighting==='mapped unlit')?' Map data marks an unlit section ahead.':''}`)")
p.write_text(s)
shutil.copy2(root / 'Mobile' / 'avatar-profile.js', target / 'avatar-profile.js')
p = target / 'app.js'
s = "import {profileMarker,installAvatarProfile} from './avatar-profile.js';\n" + p.read_text()
s = s.replace("function avatarHTML(){const bike=", "function avatarHTML(){const personal=profileMarker(state.mode);if(personal)return personal;const bike=")
s += "\ninstallAvatarProfile({onChange:()=>{drawGPS();drawPoints()},toast});\n"
p.write_text(s)
shutil.copy2(root / 'Mobile' / 'layout.js', target / 'layout.js')
p = target / 'index.html'
p.write_text(p.read_text().replace('</body>', '<script type="module" src="layout.js"></script></body>'))
