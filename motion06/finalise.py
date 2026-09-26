"""Keep a won run resumable until its ending/teaser have been read or skipped."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/src/main/assets/www/campaign-ui.js';s=p.read_text()
a="save&&save.stage!=='won'&&save.stage!=='lost'?b('Continue "
b="save&&((save.stage!=='won'&&save.stage!=='lost')||(window.StoryCursor&&StoryCursor.pending(save)))?b('Continue "
if a in s:p.write_text(s.replace(a,b,1))
elif b not in s:raise SystemExit('Missing saved-run menu gate')
p=root/'app/src/androidTest/java/uk/co/hotbox/cardgame/MotionComicSmoke.java';s=p.read_text()
marker='            result.putString("stream","\\nMOTION_COMIC_SMOKE:PASS '
insert='''            js("MotionComic.close();HotBoxShell.home();var endRun=AfterHours.create('caz',789);endRun.node=7;endRun.stage='won';endRun.wallet=900000;endRun.score=900000;StoryCursor.begin(endRun,'ending','teaser');StoryCursor.seek(endRun,2);localStorage.setItem('hotbox-cymra-v4',JSON.stringify(endRun));HotBoxShell.rerender()");
            check("!!document.querySelector('.after-entry [data-ah=continue]')", "Completed run retains unread epilogue continuation");
            js("document.querySelector('.after-entry [data-ah=continue]').click()");
            check("MotionComic.state().id==='ending' && MotionComic.state().page===2", "Completed run resumes exact ending panel");
            js("document.querySelector('[data-mc=skip]').click()");
            check("MotionComic.state().id==='buried' && AHUI.run().wallet===900000", "Ending leads to teaser without a second reward");
            js("document.querySelector('[data-mc=skip]').click()");
            check("!MotionComic.active() && AHUI.run().stage==='won' && AHUI.run().score===900000", "Teaser returns to completed run summary");
'''
if 'Completed run retains unread' not in s:
    if marker not in s:raise SystemExit('Missing native completion test insertion point')
    p.write_text(s.replace(marker,insert+marker,1))
print('Unread ending remains resumable; four installed-APK checks added')
