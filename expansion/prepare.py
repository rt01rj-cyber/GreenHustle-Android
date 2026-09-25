"""Apply the v0.3 expansion to the retained v0.2 source, with checked patch anchors.
Run before tests, local previews and Gradle. Idempotent; fails rather than guessing.
"""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
WWW=ROOT/'app/src/main/assets/www'
def change(path, transform, marker):
    p=ROOT/path; old=p.read_text()
    if marker in old: return
    new=transform(old)
    assert new != old, 'No change: '+path
    p.write_text(new+'\n'+marker+'\n')
def rep(s,old,new):
    assert old in s, 'Missing expected source anchor: '+old[:90]
    return s.replace(old,new,1)
def engine(s):
    s=rep(s,"var BY = {};", "var BY = {};")
    # Give one small product as well as the opener, preserving deck/hand counts.
    s=rep(s,"var lower=Math.ceil(s.deck.length*2/3)","s.players.forEach(function(p){if(!p.hand.some(function(c){return c.id==='baggie';})){var ix=s.deck.findIndex(function(c){return c.id==='baggie';});if(ix>=0){var old=p.hand[4];p.hand[4]=s.deck[ix];s.deck[ix]=old;}}});\n    var lower=Math.ceil(s.deck.length*2/3)")
    s=rep(s,"p.stash.length<6", "p.stash.length<(p.maxStash||6)")
    s=rep(s,"return out;\n  }\n  function equivalent", "if(p.mods&&p.mods.double&&p.line&&!p.raid&&p.stash.filter(function(c){return c.id==='baggie';}).length>=2)out.push({type:'bankpair'});\n    return out;\n  }\n  function equivalent")
    start=s.index("    if(a.type==='bank'){")
    end=s.index("    if(a.type==='pass')",start)
    s=s[:start]+'''    if(a.type==='bank'||a.type==='bankpair'){
      var take=a.type==='bankpair'?p.stash.filter(function(x){return x.id==='baggie';}).slice(0,2):[p.stash.find(function(x){return x.uid===a.uid;})];
      var cash=0,reduced=p.fake,mods=p.mods||{},bonus=0,bonusNames=[];
      take.forEach(function(x,index){var base=value(x),extra=0;
        if(x.id==='baggie'&&mods.pocket){extra+=5000;bonusNames.push('Pocket Rocket');}
        if(x.id==='vape'&&mods.vapesurge){extra+=5000;bonusNames.push('Pocket Premium');}
        if(x.id==='cali'&&mods.calicash){extra+=10000;bonusNames.push('Fancy Packaging');}
        cash+=(base+extra)*(index===0&&reduced?0.5:1);p.stash.splice(p.stash.indexOf(x),1);s.discard.push(x);
      });
      p.bankCount=(p.bankCount||0)+1;
      if(mods.loyalty&&p.bankCount%3===0){bonus+=10000;bonusNames.push('Third Time Lucky');}
      if(mods.rainyday&&p.bankCount===1){bonus+=10000;bonusNames.push('Rainy Day Fund');}
      if(p.nextBonus){bonus+=p.nextBonus;p.nextBonus=0;bonusNames.push('Lucky Receipt');}
      cash+=bonus;p.fake=false;p.bank+=cash;p.roundBank+=cash;s.stats.banks++;
      event(s,'bank',p.name+' banks '+money(cash)+(reduced?' — first product halved.':'. Safe from Raptor.')+(bonusNames.length?' '+bonusNames.join(' + ')+'!':''),take[0].id,seat);
      advance(s);return {ok:true};
    }
''' +s[end:]
    s=rep(s,"p.hand.push(c);s.phase='act';event(s,'draw'", "p.hand.push(c);var queued=p.bonusDraw||0;p.bonusDraw=0;while(queued-->0){var extra=s.deck.shift();if(!extra||extra.id==='raptor'){if(extra)s.discard.push(extra);roundEnd(s);return {ok:true};}p.hand.push(extra);}\n      s.phase='act';event(s,'draw'")
    s=rep(s,"s.stats.counters++;event(s,'counter'", "var reward='';if(!p.counterUsed){p.counterUsed=true;if(p.hero==='caz'){p.bonusDraw=(p.bonusDraw||0)+1;reward+=' Second Wind: extra card on your next draw.';}if(p.mods&&p.mods.counterpay){p.bank+=5000;p.roundBank+=5000;reward+=' Comeback Bonus: +£5k banked.';}}\n      s.stats.counters++;event(s,'counter'")
    s=rep(s,"def(c).name+'!',c.id", "def(c).name+'!'+reward,c.id")
    s=rep(s,"if(products.length){var c=products[0];pool.splice(pool.indexOf(c),1);s.discard.push(c);note=p.name+' loses '+def(c).name+'.';}", "if(products.length){var c=products[0];if(pool===p.stash&&c.id==='baggie'&&p.mods&&p.mods.cushion&&!p.cushionUsed){p.cushionUsed=true;note=p.name+' keeps The 3.5. Cwtch Cushion!';}else{pool.splice(pool.indexOf(c),1);s.discard.push(c);note=p.name+' loses '+def(c).name+'.';}}")
    # Campaign-aware bot scoring is used only for our simulation and honest recommendations.
    s=rep(s,"if(a.type==='bank'){var v=", "if(a.type==='bankpair')score=85+urgency;\n      if(a.type==='bank'){var v=")
    s=rep(s,"score=55+v/2000+urgency;", "score=55+v/2000+urgency;if(p.mods&&p.mods.pocket&&v===5000)score+=6;")
    s=rep(s,"  function restore(raw)", '''  function redraw(s,seat,uids){
    if(s.phase!=='act'||s.current!==seat||!Array.isArray(uids)||uids.length<1||uids.length>2||new Set(uids).size!==uids.length)return {ok:false,error:'Choose one or two different hand cards, after drawing.'};
    var p=s.players[seat];if(uids.some(function(uid){return !p.hand.some(function(c){return c.uid===uid;});}))return {ok:false,error:'That card is not in your hand.'};
    uids.forEach(function(uid){s.discard.push(p.hand.splice(p.hand.findIndex(function(c){return c.uid===uid;}),1)[0]);});
    for(var i=0;i<uids.length;i++){var c=s.deck.shift();if(!c||c.id==='raptor'){if(c)s.discard.push(c);roundEnd(s);return {ok:true};}p.hand.push(c);}
    event(s,'skill',p.name+' refreshes '+uids.length+' card'+(uids.length===1?'':'s')+'. Main action still available.',null,seat);return {ok:true};
  }
  function restore(raw)''')
    return rep(s,"return {catalog:C", "return {redraw:redraw,catalog:C")

def app(s):
    # Bridge to the expansion: never expose mutable engine state to external URLs.
    s=rep(s,"function art(name,extra){", "function art(name,extra){if(window.HotBoxArt&&HotBoxArt.has(name))return '<div class=\"art fresh '+(extra||'')+'\">'+HotBoxArt.draw(name)+'</div>'; ")
    s=rep(s,"function portrait(p){return art(AV[p.avatar]||'you','avatar');}","function portrait(p){return art(p.hero||AV[p.avatar]||'you','avatar');}")
    s=rep(s,"function save() {", "function save() {") if "function save() {" in s else s
    s=rep(s,"function save(){if(state)","function save(){if(window.AHUI&&AHUI.active()){AHUI.save(state);return;}if(state)")
    s=rep(s,"function startGame(force){", "function startGame(force){if(window.AHUI)AHUI.detach();")
    s=rep(s,"function continueGame(){", "function continueGame(){if(window.AHUI)AHUI.detach();")
    s=rep(s,"if(screen==='menu'){renderMenu();return;}","if(screen==='menu'){renderMenu();if(window.AHUI)AHUI.menu();return;}")
    s=rep(s," renderGame();\n if(locked)"," renderGame();if(window.AHUI&&AHUI.active())AHUI.decorate(state);\n if(locked)")
    s=rep(s,"if(modal!=='results')showResults();return;", "if(window.AHUI&&AHUI.active()){AHUI.complete(state);return;}if(modal!=='results')showResults();return;")
    s=rep(s,"function home(){stop();save();", "function home(){stop();save();if(window.AHUI)AHUI.detach();")
    s=rep(s,"esc(label)","esc(ev&&state.players[ev.actor]?state.players[ev.actor].name.toUpperCase()+' · '+ev.type.toUpperCase():label)")
    s=rep(s,"}\nfunction render(){", "root.querySelector('.rivals').classList.toggle('single',others.length===1);var turnEl=document.createElement('div');turnEl.className='current-turn';turnEl.textContent=label;root.querySelector('.arena').prepend(turnEl);\n}\nfunction render(){")
    s=rep(s, "'<div class=\"micro-card art art-'+E.def(c).art+'\"><span>'", "'<div class=\"micro-card\">'+art(E.def(c).art)+'<span>'")
    s=rep(s,"function back(){", "function back(){if(window.AHUI&&AHUI.back&&AHUI.back())return true;")
    # Meaningful action remains visible across draw events; separate actor from next turn.
    s=rep(s,"ev=state.events[0],danger=", "ev=state.events.find(function(x){return x.type!=='draw';})||state.events[0],danger=")
    s=rep(s,"function move(a){stop();", "function move(a){stop();")
    s=rep(s,"save();render();animate(state.events[0]);}","save();render();animate(state.events[0]);if(state.events[0]&&state.events[0].type!=='draw'){var previous=state.players[state.events[0].actor];var head=document.querySelector('.action-banner .message strong');if(head&&previous)head.textContent=previous.name.toUpperCase()+' · '+state.events[0].type.toUpperCase();stop();var token=epoch;timer=setTimeout(function(){if(token===epoch)schedule();},prefs.motion?800:0);}}")
    s=rep(s,"storePrefs();render();document.body.dataset.ready='1';", """window.HotBoxShell={
      bind:function(s){stop();state=s;screen='game';modal='';overlay.hidden=true;locked=false;viewSeat=null;paused=false;render();},
      modal:showModal,close:closeModal,home:home,stop:stop,notify:notify,esc:esc,art:art,card:card,button:button,
      get:function(){return state;},perform:move,rerender:render,
      pause:function(){stop();},isMenu:function(){return screen==='menu';}
    };
    storePrefs();render();document.body.dataset.ready='1';""")
    return s
change('app/src/main/assets/www/engine.js',engine,'// AFTER_HOURS_ENGINE_030')
change('app/src/main/assets/www/app.js',app,'// AFTER_HOURS_SHELL_030')
# Full assets are modules alongside the patched shell. All are bundled/offline.
for name in ['campaign.js','campaign-ui.js','art.js','afterhours.css']:
    p=ROOT/'expansion'/name
    if p.exists():shutil.copy2(p,WWW/name)
p=WWW/'index.html';s=p.read_text()
if 'afterhours.css' not in s:
    s=s.replace('<link rel="stylesheet" href="styles.css">','<link rel="stylesheet" href="styles.css">\n<link rel="stylesheet" href="afterhours.css">')
    s=s.replace('<script src="engine.js"></script>','<script src="art.js"></script>\n<script src="engine.js"></script>\n<script src="campaign.js"></script>')
    s=s.replace('<script src="app.js"></script>','<script src="app.js"></script>\n<script src="campaign-ui.js"></script>')
p.write_text(s)
# Inset padding on WebView did not reduce the DOM viewport. A padded native parent does.
p=ROOT/'app/src/main/java/uk/co/hotbox/cardgame/MainActivity.java';s=p.read_text()
if 'AFTER_HOURS_INSETS_030' not in s:
    s=s.replace('import android.widget.TextView;','import android.widget.TextView;\nimport android.widget.FrameLayout;')
    a=s.index('            web.setOnApplyWindowInsetsListener(');b=s.index('            WebSettings settings',a)
    s=s[:a]+'''            // AFTER_HOURS_INSETS_030: resize child, do not merely pad WebView pixels.
            FrameLayout frame = new FrameLayout(this);
            frame.setBackgroundColor(Color.rgb(11,17,26));
            frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
            frame.setOnApplyWindowInsetsListener((v,insets) -> {
                int left=insets.getSystemWindowInsetLeft(), top=insets.getSystemWindowInsetTop();
                int right=insets.getSystemWindowInsetRight(), bottom=insets.getSystemWindowInsetBottom();
                if (android.os.Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout()!=null) {
                    left=Math.max(left,insets.getDisplayCutout().getSafeInsetLeft());
                    top=Math.max(top,insets.getDisplayCutout().getSafeInsetTop());
                    right=Math.max(right,insets.getDisplayCutout().getSafeInsetRight());
                    bottom=Math.max(bottom,insets.getDisplayCutout().getSafeInsetBottom());
                }
                v.setPadding(left,top,right,bottom);
                return insets.consumeSystemWindowInsets();
            });
''' +s[b:]
    s=s.replace('setContentView(web);\n            web.requestApplyInsets();','setContentView(frame);\n            frame.requestApplyInsets();')
    s=s.replace('path.endsWith(".webp") ? "image/webp" :','path.endsWith(".webp") ? "image/webp" : path.endsWith(".png") ? "image/png" :')
    p.write_text(s)
p=ROOT/'app/build.gradle.kts';s=p.read_text().replace('versionCode = 20','versionCode = 30').replace('versionName = "0.2.0"','versionName = "0.3.0"');p.write_text(s)
print('After Hours 0.3 modules and safe-area shell prepared.')

# Side-by-side playtest package avoids overwriting an older APK signed by another runner.
p=ROOT/'app/build.gradle.kts';s=p.read_text().replace('applicationId = "uk.co.hotbox.cardgame"','applicationId = "uk.co.hotbox.afterhours"');p.write_text(s)
p=ROOT/'app/src/main/AndroidManifest.xml';s=p.read_text().replace('android:name=".MainActivity"','android:name="uk.co.hotbox.cardgame.MainActivity"');p.write_text(s)
p=ROOT/'app/src/main/res/values/strings.xml';p.write_text('<resources><string name="app_name">Hot Box: After Hours</string></resources>\n')
p=ROOT/'scripts/smoke.sh';s=p.read_text().replace('0.2.0','0.3.0').replace('uk.co.hotbox.cardgame.test/','uk.co.hotbox.afterhours.test/').replace('uk.co.hotbox.cardgame/.MainActivity','uk.co.hotbox.afterhours/uk.co.hotbox.cardgame.MainActivity');p.write_text(s)
# Additional native checks run against the actual installed, offline APK.
p=ROOT/'app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java';s=p.read_text()
if 'AFTER_HOURS_NATIVE_030' not in s:
    insertion=(ROOT/'expansion/native-extra.txt').read_text()
    anchor='            result.putString("stream", "\\nHOTBOX_SMOKE:PASS'
    assert anchor in s, 'Native test success anchor not found'
    s=s.replace(anchor,insertion+'\n'+anchor,1)
    s=s.replace('launch, draw, inspect, save, resume, recreate','classic + story: launch, draw, inspect, Riz skill, separate saves, recreate, insets')
    p.write_text(s)
