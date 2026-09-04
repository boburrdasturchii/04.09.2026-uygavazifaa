import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable cache during development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure correct MIME types for neural network shards and wasm
        if path.endswith('.json'):
            return 'application/json'
        if path.endswith('.bin'):
            return 'application/octet-stream'
        if path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)

def run():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("🚀 Anti-Gravity AI Vision Engine (Browser Live Stream)")
        print(f"📡 Server ishga tushdi: {url}")
        print("👁️ Brauzer avtomatik ravishda ochilmoqda...")
        print("⏹️ To'xtatish uchun: Ctrl + C bosing")
        print("=" * 60)
        
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"Brauzerni ochishda ogohlantirish: {e}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server to'xtatildi.")
            sys.exit(0)

if __name__ == '__main__':
    run()
