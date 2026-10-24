import SwiftUI
import WebKit
import CoreLocation
import UniformTypeIdentifiers

struct MapView: UIViewRepresentable {
    func makeCoordinator() -> Bridge { Bridge() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(Assets(), forURLScheme: "pathfinder")
        config.userContentController.add(context.coordinator, name: "location")
        config.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "address")
        config.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "shareLocation")
        let script = try! String(contentsOf: Bundle.main.url(forResource: "native", withExtension: "js")!)
        config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.scrollView.isScrollEnabled = false
        web.isOpaque = false
        web.backgroundColor = .white
        #if DEBUG
        web.isInspectable = true
        #endif
        context.coordinator.web = web
        context.coordinator.showStartup(in: web)
        web.load(URLRequest(url: URL(string: "pathfinder://app/index.html")!))
        return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

final class Assets: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "app",
              let root = Bundle.main.resourceURL?.appendingPathComponent("Web").resolvingSymlinksInPath().standardizedFileURL else {
            task.didFailWithError(URLError(.badURL)); return
        }
        // iOS may expose the same bundle through /private/var and /var.
        // Canonicalize both sides before checking containment, including symlinks.
        let file = root.appendingPathComponent(url.path).resolvingSymlinksInPath().standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let types = ["js":"application/javascript", "json":"application/json", "css":"text/css", "html":"text/html", "svg":"image/svg+xml"]
        let mime = types[file.pathExtension] ?? UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: mime.hasPrefix("text/") ? "utf-8" : nil))
        task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class Bridge: NSObject, WKScriptMessageHandler, WKScriptMessageHandlerWithReply, CLLocationManagerDelegate, WKNavigationDelegate {
    weak var web: WKWebView?
    private var startupView: UIView?
    private var startupTimeout: Timer?
    private var recoveryAttempted = false
    func showStartup(in webView: WKWebView, failed: Bool = false) {
        startupView?.removeFromSuperview()
        startupTimeout?.invalidate()
        let panel = UIStackView()
        panel.axis = .vertical; panel.alignment = .center; panel.spacing = 16
        let label = UILabel()
        label.text = failed ? "Safr couldn’t open. Please try again." : "Opening Safr…"
        label.font = .preferredFont(forTextStyle: .headline)
        label.textColor = .label; label.numberOfLines = 0; label.textAlignment = .center
        panel.addArrangedSubview(label)
        if failed {
            let button = UIButton(type: .system)
            button.configuration = .filled(); button.setTitle("Retry", for: .normal)
            button.addAction(UIAction { [weak self, weak webView] _ in
                guard let self, let webView else { return }
                self.showStartup(in: webView)
                webView.load(URLRequest(url: URL(string: "pathfinder://app/index.html")!))
            }, for: .touchUpInside)
            panel.addArrangedSubview(button)
        } else {
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.startAnimating(); panel.addArrangedSubview(spinner)
            startupTimeout = Timer.scheduledTimer(withTimeInterval: 20, repeats: false) { [weak self, weak webView] _ in
                guard let webView else { return }; self?.showStartup(in: webView, failed: true)
            }
        }
        panel.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(panel)
        NSLayoutConstraint.activate([panel.centerXAnchor.constraint(equalTo: webView.centerXAnchor), panel.centerYAnchor.constraint(equalTo: webView.centerYAnchor), panel.widthAnchor.constraint(lessThanOrEqualTo: webView.widthAnchor, constant: -40)])
        startupView = panel
    }
    private let manager = CLLocationManager()
    private var requests: [Int: Bool] = [:]
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.activityType = .fitness
        NotificationCenter.default.addObserver(self, selector: #selector(pause), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(resume), name: UIApplication.didBecomeActiveNotification, object: nil)
    }
    deinit { NotificationCenter.default.removeObserver(self); manager.stopUpdatingLocation() }
    private func trusted(_ message: WKScriptMessage) -> Bool {
        message.frameInfo.isMainFrame && message.frameInfo.securityOrigin.protocol == "pathfinder" && message.frameInfo.securityOrigin.host == "app"
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard trusted(message), let body = message.body as? [String: Any] else { return }
        if let awake = body["awake"] as? Bool { UIApplication.shared.isIdleTimerDisabled = awake; return }
        guard let id = body["id"] as? Int else { return }
        if body["action"] as? String == "stop" { requests.removeValue(forKey: id); if requests.isEmpty { manager.stopUpdatingLocation() }; return }
        requests[id] = body["watch"] as? Bool ?? false
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse: manager.startUpdatingLocation()
        default: fail(code: 1, message: "Allow location access in iPhone Settings → Safr.")
        }
    }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard !requests.isEmpty else { return }
        if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways { manager.startUpdatingLocation() }
        else if manager.authorizationStatus != .notDetermined { fail(code: 1, message: "Location permission was not granted.") }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let p = locations.last, p.horizontalAccuracy >= 0 else { return }
        let coords: [String: Any] = ["latitude": p.coordinate.latitude, "longitude": p.coordinate.longitude, "accuracy": p.horizontalAccuracy, "altitude": p.altitude, "altitudeAccuracy": p.verticalAccuracy >= 0 ? p.verticalAccuracy as Any : NSNull(), "heading": p.course >= 0 ? p.course as Any : NSNull(), "speed": p.speed >= 0 ? p.speed as Any : NSNull()]
        for (id, watch) in requests {
            send(["id": id, "position": ["coords": coords, "timestamp": p.timestamp.timeIntervalSince1970 * 1000]])
            if !watch { requests.removeValue(forKey: id) }
        }
        if requests.isEmpty { manager.stopUpdatingLocation() }
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if (error as? CLError)?.code == .denied { fail(code: 1, message: "Location access is blocked.") }
        else { fail(code: 2, message: "Location is unavailable. Try outdoors or enter an address.") }
    }
    private func fail(code: Int, message: String) {
        for id in requests.keys { send(["id": id, "error": ["code": code, "message": message]]) }
        requests.removeAll(); manager.stopUpdatingLocation()
    }
    private func send(_ value: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: value), let json = String(data: data, encoding: .utf8) else { return }
        web?.evaluateJavaScript("window.pathfinderLocation(\(json))", completionHandler: nil)
    }
    @objc private func pause() { manager.stopUpdatingLocation(); UIApplication.shared.isIdleTimerDisabled = false }
    @objc private func resume() { if !requests.isEmpty { manager.startUpdatingLocation() }; web?.evaluateJavaScript("window.pathfinderResume?.()", completionHandler: nil) }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        startupTimeout?.invalidate(); startupView?.removeFromSuperview(); startupView = nil
        webView.evaluateJavaScript("JSON.stringify({title:document.title,body:document.body?.innerText.length,width:innerWidth,height:innerHeight})") { value, error in
            print("Safr loaded: \(String(describing: value)) error=\(String(describing: error))")
        }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showStartup(in: webView, failed: true); print("Safr load failed: \(error)") }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showStartup(in: webView, failed: true); print("Safr navigation failed: \(error)") }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        guard !recoveryAttempted else { showStartup(in: webView, failed: true); return }
        recoveryAttempted = true; showStartup(in: webView); webView.reload()
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "pathfinder", url.host == "app" { decisionHandler(.allow) }
        else { decisionHandler(.cancel); if action.navigationType == .linkActivated && url.scheme == "https" { UIApplication.shared.open(url) } }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        if message.name == "shareLocation" {
            guard trusted(message), let body = message.body as? [String: Any],
                  let lat = body["latitude"] as? Double, let lon = body["longitude"] as? Double,
                  lat.isFinite, lon.isFinite, abs(lat) <= 90, abs(lon) <= 180,
                  let web = web, var presenter = web.window?.rootViewController else {
                replyHandler(nil, "Location sharing is unavailable."); return
            }
            while let presented = presenter.presentedViewController { presenter = presented }
            let url = URL(string: "https://maps.apple.com/?ll=\(lat),\(lon)&q=Shared%20location")!
            let activity = UIActivityViewController(activityItems: ["My location snapshot from Safr (not live tracking).", url], applicationActivities: nil)
            activity.popoverPresentationController?.sourceView = web
            activity.popoverPresentationController?.sourceRect = CGRect(x: web.bounds.midX, y: web.bounds.midY, width: 1, height: 1)
            activity.completionWithItemsHandler = { _, completed, _, error in
                replyHandler(["shared": completed], error?.localizedDescription)
            }
            presenter.present(activity, animated: true); return
        }
        guard trusted(message), let body = message.body as? [String: Any], let q = body["query"] as? String, (6...160).contains(q.count) else { replyHandler(nil, "Invalid address"); return }
        Task {
            do {
                var queries = [q]
                if body["houston"] as? Bool == true && q.range(of: #"\b(houston|texas|tx)\b|\b\d{5}\b"#, options: [.regularExpression, .caseInsensitive]) == nil { queries.append(q + ", Houston, TX") }
                for query in queries {
                    var url = URLComponents(string: "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress")!
                    url.queryItems = [URLQueryItem(name: "address", value: query), URLQueryItem(name: "benchmark", value: "Public_AR_Current"), URLQueryItem(name: "format", value: "json")]
                    let (data, response) = try await URLSession.shared.data(for: URLRequest(url: url.url!, timeoutInterval: 5))
                    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
                    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let result = json?["result"] as? [String: Any]
                    let matches = result?["addressMatches"] as? [[String: Any]] ?? []
                    if !matches.isEmpty { replyHandler(matches, nil); return }
                }
                replyHandler([], nil)
            } catch { replyHandler(nil, "Address search is temporarily unavailable.") }
        }
    }
}
