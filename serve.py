#!/usr/bin/env python3
"""
serve.py — Musiorganolog geliştirme sunucusu

Özellikler:
  • Gzip sıkıştırma  — JS / CSS / HTML / JSON / SVG yanıtları otomatik sıkıştırılır
  • Akıllı önbellek  — ?v=… ile versiyonlu dosyalar 1 yıl; HTML her zaman yeniden doğrulanır
  • ETag desteği     — değişmeyen dosyalar için 304 Not Modified döner
  • MIME tipi haritası genişletildi
  • CORS açık        — yerel geliştirme için tüm kaynaklara izin verilir
"""

import gzip
import hashlib
import io
import mimetypes
import os
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

# ── Sunucu kök dizinini script'in bulunduğu klasör yap ────────────
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8765

# ── Sıkıştırılacak MIME tipleri ────────────────────────────────────
COMPRESSIBLE = {
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'image/svg+xml',
    'text/plain',
    'application/xml',
    'text/xml',
}

# ── MIME haritası genişletme ────────────────────────────────────────
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json',       '.json')
mimetypes.add_type('image/svg+xml',          '.svg')
mimetypes.add_type('text/css',               '.css')


class GzipHandler(SimpleHTTPRequestHandler):
    """
    SimpleHTTPRequestHandler üzerine eklenenler:
      1. Otomatik gzip sıkıştırma (Accept-Encoding: gzip varsa)
      2. Akıllı Cache-Control başlıkları
      3. ETag + 304 desteği
      4. CORS başlıkları
    """

    server_version = 'MusiorganologDev/2.0'
    protocol_version = 'HTTP/1.1'

    # ── Önbellek politikası ──────────────────────────────────────────
    @staticmethod
    def _cache_control(path: str) -> str:
        """
        Dosya yoluna göre uygun Cache-Control değeri döner.

        Kural:
          • HTML                    → no-cache  (her zaman sunucudan doğrula)
          • ?v= ile versiyonlu varlık → 1 yıl immutable
          • .json data dosyaları    → 1 saat
          • Diğer (CSS, JS, görseller) → 1 gün
        """
        lower = path.lower()
        if lower.endswith('.html') or lower == '/':
            return 'no-cache'
        # Query string'de ?v= varsa — versiyonlanmış, sonsuza kadar önbellekle
        # (SimpleHTTPRequestHandler path'i query string olmadan geçirir;
        #  bu bilgiyi do_GET'ten taşırız)
        return 'max-age=86400'  # varsayılan: 1 gün

    # ── İstek karşılama ──────────────────────────────────────────────
    def do_GET(self):
        # Query string ayrıştır
        parsed   = urlparse(self.path)
        qs       = parsed.query          # 'v=20' gibi
        filepath = parsed.path           # '/js/app.js'

        # Gerçek dosya yolu
        fs_path = self.translate_path(filepath)
        if not os.path.isfile(fs_path):
            # Dizin isteği veya 404 — varsayılan davranışa bırak
            super().do_GET()
            return

        # ── Dosyayı oku ──────────────────────────────────────────────
        try:
            with open(fs_path, 'rb') as f:
                data = f.read()
        except OSError:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        # ── ETag hesapla (SHA-1 küçük dosyalar için yeterli) ──────────
        etag = '"' + hashlib.sha1(data).hexdigest()[:16] + '"'

        # ── 304 kontrolü ─────────────────────────────────────────────
        if_none_match = self.headers.get('If-None-Match', '')
        if if_none_match and etag in if_none_match:
            self.send_response(HTTPStatus.NOT_MODIFIED)
            self._send_common_headers(fs_path, qs, etag)
            self.end_headers()
            return

        # ── MIME tipi ─────────────────────────────────────────────────
        mime, _ = mimetypes.guess_type(fs_path)
        if not mime:
            mime = 'application/octet-stream'

        # ── Gzip sıkıştırma ───────────────────────────────────────────
        accept_enc = self.headers.get('Accept-Encoding', '')
        use_gzip   = 'gzip' in accept_enc and mime in COMPRESSIBLE

        if use_gzip:
            buf = io.BytesIO()
            with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=6) as gz:
                gz.write(data)
            body = buf.getvalue()
        else:
            body = data

        # ── Yanıt gönder ──────────────────────────────────────────────
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type',   mime)
        self.send_header('Content-Length', str(len(body)))
        if use_gzip:
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
        self._send_common_headers(fs_path, qs, etag)
        self.end_headers()
        self.wfile.write(body)

    def _send_common_headers(self, fs_path: str, qs: str, etag: str):
        """Cache-Control, ETag ve CORS başlıkları."""
        # Versiyonlanmış varlık → uzun önbellek
        if qs and qs.startswith('v='):
            cache = 'public, max-age=31536000, immutable'
        else:
            cache = self._cache_control(fs_path)

        self.send_header('Cache-Control', cache)
        self.send_header('ETag',          etag)
        self.send_header('Access-Control-Allow-Origin', '*')

    def log_message(self, fmt, *args):
        """Renkli konsol çıktısı."""
        status = args[1] if len(args) > 1 else '?'
        color  = '\033[32m' if str(status).startswith('2') else \
                 '\033[33m' if str(status).startswith('3') else \
                 '\033[31m'
        reset  = '\033[0m'
        print(f'{color}[{self.log_date_time_string()}] {fmt % args}{reset}',
              flush=True)


# ── Başlat ────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    with ThreadingHTTPServer(('', port), GzipHandler) as httpd:
        print(f'\033[36m✦ Musiorganolog Dev Server\033[0m  →  '
              f'\033[1mhttp://localhost:{port}\033[0m')
        print(f'  Gzip sıkıştırma  ✓   ETag önbellek  ✓   CORS açık  ✓')
        print(f'  Durdurmak için Ctrl+C', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\033[33m▸ Sunucu durduruldu.\033[0m')
