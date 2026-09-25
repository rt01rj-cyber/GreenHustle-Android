"""Reconstruct and verify the approved bundled artwork before an Android build."""
from pathlib import Path
import hashlib

root = Path(__file__).resolve().parents[1]
art = root / 'app/src/main/assets/www/art/atlas.webp'
expected = '10e0efc4fc1723c6b564812731d5a354ecb19d4c0799b9e4566b51864b013654'
parts = [root / ('art-src/atlas-%d.bin' % n) for n in range(7)]
if all(p.is_file() for p in parts):
    data = b''.join(p.read_bytes() for p in parts)
    if hashlib.sha256(data).hexdigest() != expected:
        raise SystemExit('Artwork chunks failed SHA-256 verification')
    art.parent.mkdir(parents=True, exist_ok=True)
    art.write_bytes(data)
else:
    data = art.read_bytes()
if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
    raise SystemExit('Artwork is not a WebP file')
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('Bundled artwork failed SHA-256 verification')
print('Bundled approved-concept artwork:', len(data), 'bytes; SHA-256 verified')
