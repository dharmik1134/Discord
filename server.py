#!/usr/bin/env python3
"""
Nexus Party - Discord-Style 1080p60 WebRTC Voice & Video Party Server
Serves static application files and handles multi-device WebRTC signaling.
"""

import http.server
import socketserver
import json
import urllib.parse
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# In-memory WebRTC signaling queue per room
ROOM_SIGNALS = {}

class NexusPartyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path.startswith('/api/signal'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                room = data.get('room', 'default')
                if room not in ROOM_SIGNALS:
                    ROOM_SIGNALS[room] = []
                
                ROOM_SIGNALS[room].append(data)
                # Keep last 50 signals
                if len(ROOM_SIGNALS[room]) > 50:
                    ROOM_SIGNALS[room].pop(0)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))
            except Exception as e:
                self.send_error(400, f'Bad Request: {str(e)}')
            return
        
        super().do_POST()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/signals':
            query = urllib.parse.parse_qs(parsed.query)
            room = query.get('room', ['default'])[0]
            since = int(query.get('since', [0])[0])

            signals = ROOM_SIGNALS.get(room, [])
            new_signals = signals[since:] if since < len(signals) else []

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'signals': new_signals, 'count': len(signals)}).encode('utf-8'))
            return

        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), NexusPartyHandler) as httpd:
        print('=====================================================')
        print('NEXUS PARTY - DISCORD 1080P60 VOICE & VIDEO SERVER')
        print('-----------------------------------------------------')
        print(f'Local Web Application: http://localhost:{PORT}')
        print('1080p 60FPS Stream Preset: ACTIVE')
        print('=====================================================')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
