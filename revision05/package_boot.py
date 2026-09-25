"""Bundle the local boot document atomically and isolate Classic saves from Story."""
from pathlib import Path
import re,json,hashlib
root=Path(__file__).resolve().parents[1]
www=root/'app/src/main/assets/www'
app=www/'app.js';text=app.read_text()
if '// CASEFILE_BOOT_05' not in text:
    before="return x?E.restore(x):null;"
    after="if(!x)return null;var restored=E.restore(x);return restored.campaign?null:restored;"
    assert text.count(before)==1,'Unexpected saved() source'
    text=text.replace(before,after)
    before="if(state)try{localStorage.setItem(KEY,JSON.stringify(state));}"
    after="if(state&&!state.campaign)try{localStorage.setItem(KEY,JSON.stringify(state));}"
    assert text.count(before)==1,'Unexpected save() source'
    text=text.replace(before,after)+'\n// CASEFILE_BOOT_05\n'
    app.write_text(text)
index=www/'index.html';html=index.read_text()
if '<!-- CASEFILE_ATOMIC_BOOT -->' not in html:
    def css(m):return '<style>\n'+(www/m[1]).read_text()+'\n</style>'
    def js(m):
        script=(www/m[1]).read_text()
        assert '</script' not in script.lower(),'Unsafe embedded closing tag'
        return '<script>\n'+script+'\n</script>'
    html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',css,html)
    html=re.sub(r'<script src="([^"]+)"></script>',js,html)
    html=html.replace('</body>','<script>if(window.AHUI){AHUI.menu();document.body.dataset.caseReady="1";console.info("HOTBOX_CASE_READY");}</script>\n<!-- CASEFILE_ATOMIC_BOOT -->\n</body>')
    index.write_text(html)
smoke=root/'app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java'
t=smoke.read_text()
t=t.replace('!!window.AHUI&&document.body.dataset.ready===\'1\'', '!!window.AHUI&&document.body.dataset.caseReady===\'1\'&&!!document.querySelector(\'.after-entry\')')
needle='check("!!document.querySelector(\'[data-ah=continue]\')","Native save survives Activity recreation");'
addition=needle+'\n        check("!document.querySelector(\'[data-do=continue]\')","Story does not overwrite Classic save");'
if 'Story does not overwrite Classic save' not in t:
    assert needle in t
    t=t.replace(needle,addition)
smoke.write_text(t)
paths=['app/src/main/assets/www/'+p for p in ['app.js','index.html']]+['app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java']
(root/'revision05/packaged-sha256.json').write_text(json.dumps({p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths},indent=2))
print('Atomic bundled boot, explicit Story readiness and save isolation prepared')
