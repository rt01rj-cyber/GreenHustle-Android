"""Prepare the exact approved Hot Box 0.4 build from verified Git blob objects."""
import base64
import hashlib
import json
import lzma
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'rt01rj-cyber/GreenHustle-Android'
SOURCE = ['4b42bb0bed2e6377f4d54e1ac07d6ff1b00e44a1','f720771eee9b72014369b5d981f4fc181faf1d21','54e3490de6dccf896d638cf1ef67da6d8d32842e']
ART = ['914151e40d30c332ba35b4620668c033661b16ab','4e6ab35bdb9aa4bac9a2956673d49ab17808c0f5','0fe5e2ca6afbe0fab3da4d167d38126af5b601e1','996046759daef5e06c03592fe1015730d6ed8ccb','6b5c595dc9c0dc606cbf17e36ae2c04570b6d08a','3dec1d0d438085728d72defdafb8f534b0b6af01','f727afba5c0ef164416e79bbf70eb44132730a0d','2f78413266fa86584281b3a1c05851df3be5428d','79637d66291fd9b8191e1522a1154da9fa2021a5','3be8d5e93eceef37d757243346ff923c25fd9fb3','a5f4f6d9ca893da50cbc82d58ab6d627e242c4bc','7485ffadd586d96238cf1a303632746424794721','1fafb804c1ef60ec7a7d81ab9b3ae204af7fbefe']
FILES = {
 'app/src/main/assets/www/engine.js':'aa2b63e6dec0c44db86173cc9b698fa3685ac96e78a9a424637f719b25b2b781',
 'app/src/main/assets/www/app.js':'155c52c620216f0d5890b3f8cf34d1684261f0e2d89dfc4c52e35695e69e3837',
 'app/src/main/assets/www/campaign.js':'7ea105e350c3d64ca6f1e5d85956553d2fda7abcbd4b635e565ac5107f63c604',
 'app/src/main/assets/www/campaign-ui.js':'3b8fb9c84113a3481c79fc82196188d51930ddf497622ba0b1e0e1d28681eb94',
 'app/src/main/assets/www/comic.js':'a4a22fcd17f62e609315903831efed2644290048b748703c9de631fe86c801fd',
 'app/src/main/assets/www/cymra.css':'cc67cbf6a9d2c565910661e96009acc02d86bc9fa04d719718eaed0b0e11dbd8',
 'app/src/main/assets/www/index.html':'740758c8b8ee02148164abae66c3f31fa9951e04e79c09c89d2767552e984f64',
 'app/src/main/assets/www/art/cymra.json':'421f71c948134c6a9b009a4f1fcdf8a1fca0241090049814c00512162475fb9e',
 'app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java':'dcbfb6d3ec7dc7de67d252e45f9624bd3187b7689916fbdcd91db356a7967144',
 'app/build.gradle.kts':'003db4db77434f34a1cbe7284cdadb88de4a46cebeb8201ef8d7363f36241bb7',
 'app/src/main/res/values/strings.xml':'15a4787ccaef6d710e1571e5549423ac8e6117e58370da9cebdf7935d6e434a8',
 'scripts/smoke.sh':'8e22f61f59e912e0faa8b776ae1738e3429d2cdfb68528465a94fa8fec85d063',
 'tests/cymra.test.js':'ff2b005e6cb5be5bd66b58434afa6c225cdc812b3c3bad7ea8f4883d021aad41',
 'README.md':'e51d3f5309c566bd7153131d074f4fb7c7dae1e8ee7cc71415730581d45542c7',
 'app/src/main/assets/www/art/cymra.webp':'bf93ad7fe96779da0f105bb189c41fb679acc0c85d7456fd27efd3374ac4a38e'
}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def fetch(sha):
    req = urllib.request.Request('https://api.github.com/repos/'+REPO+'/git/blobs/'+sha,
        headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'], 'Accept':'application/vnd.github+json', 'User-Agent':'HotBox-Verified-Build'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=30) as response:
                obj=json.load(response)
            if obj.get('encoding')!='base64':
                raise ValueError('Unexpected blob encoding')
            data=base64.b64decode(obj['content'])
            actual=hashlib.sha1(('blob %d\0'%len(data)).encode()+data).hexdigest()
            if actual!=sha: raise ValueError('Git blob checksum mismatch')
            return data
        except Exception:
            if attempt==3: raise
            time.sleep(2*(attempt+1))

if all((ROOT/n).is_file() and digest((ROOT/n).read_bytes())==expected for n,expected in FILES.items()):
    print('HOTBOX_CYMRA_SOURCE_OK: readable 0.4.0 source already verified')
else:
    packed=b''.join(fetch(sha) for sha in SOURCE)
    if digest(packed)!='89e084fafe6950ab9df9249c25cd32156ed9d66857e673caf9cd51ce7cf99c71':
        raise SystemExit('Compressed source checksum mismatch')
    patches=json.loads(lzma.decompress(packed).decode('utf-8'))
    staged={}
    for name,patch in patches.items():
        if name not in FILES or name.endswith('.webp'): raise SystemExit('Unexpected patch path')
        path=ROOT/name
        if not path.resolve().is_relative_to(ROOT.resolve()): raise SystemExit('Unsafe patch path')
        old=path.read_bytes() if path.exists() else b''
        if digest(old)==FILES[name]: continue
        if digest(old)!=patch['base']: raise SystemExit('Base source changed; not overwriting: '+name)
        lines=old.decode('utf-8').splitlines(keepends=True)
        for start,end,replacement in reversed(patch['ops']):
            if start<0 or end<start or end>len(lines): raise SystemExit('Invalid patch range')
            lines[start:end]=[replacement]
        data=''.join(lines).encode('utf-8')
        if digest(data)!=FILES[name]: raise SystemExit('Expanded file checksum mismatch: '+name)
        staged[path]=data
    image=b''.join(fetch(sha) for sha in ART)
    if digest(image)!=FILES['app/src/main/assets/www/art/cymra.webp']: raise SystemExit('Comic art checksum mismatch')
    staged[ROOT/'app/src/main/assets/www/art/cymra.webp']=image
    for path,data in staged.items():
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)
for name,expected in FILES.items():
    if digest((ROOT/name).read_bytes())!=expected: raise SystemExit('Build verification failed: '+name)
print('HOTBOX_CYMRA_SOURCE_OK: 0.4.0; 15 exact files verified')
