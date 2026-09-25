"""Verify the source transport and expand the reviewed After Hours modules."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import lzma
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
parts = [root / ('expansion/transport-%d.bin' % n) for n in range(3)]
expected = '88afaba2916b7d4a02e75857c075de987c35c3d28840676a71f1a533dfa03104'
if any(p.exists() for p in parts):
    if not all(p.is_file() for p in parts):
        raise SystemExit('Incomplete source transport')
    data = b''.join(p.read_bytes() for p in parts)
    if hashlib.sha256(data).hexdigest() != expected:
        raise SystemExit('After Hours transport SHA-256 mismatch')
    files = json.loads(lzma.decompress(data).decode('utf-8'))
    if not isinstance(files, dict) or len(files) > 30:
        raise SystemExit('Invalid source map')
    for name, content in files.items():
        p = PurePosixPath(name)
        if (p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0] != 'expansion'
                or not isinstance(content, str) or len(content) > 200000):
            raise SystemExit('Unsafe source entry')
        target = root / p
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
    print('Verified and expanded', len(files), 'After Hours source files')
elif not (root / 'expansion/prepare.py').is_file():
    raise SystemExit('Neither transport nor expanded source exists')
subprocess.run([sys.executable, str(root / 'expansion/prepare.py')], check=True, cwd=root)
shutil.copy2(root / 'expansion/README-v030.md', root / 'README.md')
