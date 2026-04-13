import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🚀 ANFLIX Web Server is running!")
    print(f"👉 Visit: http://localhost:{PORT}")
    print(f"Ctrl+C to stop the server.")
    httpd.serve_forever()
