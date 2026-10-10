import http.server
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, must-revalidate'); super().end_headers()
http.server.ThreadingHTTPServer(('0.0.0.0',8080),H).serve_forever()
