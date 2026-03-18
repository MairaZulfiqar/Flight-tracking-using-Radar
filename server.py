import http.server
import socketserver
import urllib.request

PORT = 8002

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/flights':
            # Proxy request to adsb.lol to bypass CORS restrictions
            url = 'https://api.adsb.lol/v2/lat/64.95/lon/26.1/dist/250'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            # Serve static files like index.html, css, js
            super().do_GET()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"Backend Proxy Server running on http://localhost:{PORT}")
        httpd.serve_forever()
