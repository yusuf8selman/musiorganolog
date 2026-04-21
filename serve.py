#!/usr/bin/env python3
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

import http.server
import socketserver

PORT = 8765
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({'.json': 'application/json'})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
