# serve.py
import http.server, socketserver, webbrowser, os

PORT = 8080
os.chdir("output")

Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🌐 http://localhost:{PORT}")
    webbrowser.open(f"http://localhost:{PORT}")
    httpd.serve_forever()