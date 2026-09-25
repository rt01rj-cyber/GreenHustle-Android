package uk.co.hotbox.cardgame;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/** Framework-only instrumentation: tests the actual installed APK, not an HTML mock. */
public class HotBoxSmoke extends Instrumentation {
    private MainActivity activity;
    private String stage = "starting";
    private void awaitPage() {
        long until = SystemClock.uptimeMillis()+45000;
        AtomicBoolean loaded = new AtomicBoolean(false);
        do {
            runOnMainSync(() -> loaded.set(activity.getGameWebView().getProgress()==100
                    && "https://hotbox.local/index.html".equals(activity.getGameWebView().getUrl())));
            if (loaded.get()) return;
            SystemClock.sleep(150);
        } while (SystemClock.uptimeMillis()<until);
        throw new AssertionError("Bundled page load timed out");
    }
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private String js(String code) {
        AtomicReference<String> result = new AtomicReference<>();
        runOnMainSync(() -> activity.getGameWebView().evaluateJavascript(code, result::set));
        long until = SystemClock.uptimeMillis()+20000;
        while(result.get()==null && SystemClock.uptimeMillis()<until) SystemClock.sleep(50);
        if(result.get()==null) throw new AssertionError("JavaScript callback timed out during " + stage + "");
        return result.get();
    }
    private void check(String expression, String label) {
        stage = label; Log.i("HOTBOX_TEST", "Checking: " + label);
        long until = SystemClock.uptimeMillis()+30000;
        do { if("true".equals(js(expression))) { Log.i("HOTBOX_TEST", "PASS: " + label); return; } SystemClock.sleep(150); } while(SystemClock.uptimeMillis()<until);
        throw new AssertionError(label + " failed: " + js(expression));
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            Intent intent = new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity = (MainActivity) startActivitySync(intent);
            awaitPage();
            check("!!window.HotBoxUI && document.body.dataset.ready==='1'", "Launch and JavaScript boot");
            js("window.__atlasOK=false;var art=new Image();art.onload=function(){window.__atlasOK=art.naturalWidth>=512;};art.src='https://hotbox.local/art/cymra.webp';");
            check("window.__atlasOK===true", "Bundled WebP artwork");
            js("localStorage.removeItem('hotbox-save-v2'); document.querySelector('[data-do=start]').click()");
            check("!!document.querySelector('.table') && HotBoxUI.state().phase==='draw'", "Start solo table");
            js("document.querySelector('[data-do=draw]').click()");
            check("HotBoxUI.state().phase==='act' && HotBoxUI.state().players[0].hand.length===6", "Draw card");
            js("document.querySelector('.hand [data-do=inspect]').click()");
            check("!document.getElementById('overlay').hidden && !!document.querySelector('.card.large')", "Card inspection");
            js("document.querySelector('[data-do=close]').click(); document.querySelector('[data-do=pausemenu]').click(); document.querySelector('[data-do=home]').click()");
            check("!!document.querySelector('[data-do=continue]')", "Save and menu");
            js("document.querySelector('[data-do=continue]').click()");
            check("HotBoxUI.state().phase==='act' && HotBoxUI.state().players[0].hand.length===6", "Restore saved turn");
            js("HotBoxUI.pause(); HotBoxUI.resume()");
            check("HotBoxUI.state().phase==='act'", "Lifecycle resume");
            // A new Activity must be able to read the same on-device save.
            runOnMainSync(() -> activity.finish()); waitForIdleSync();
            activity = (MainActivity)startActivitySync(intent);
            awaitPage();
            check("!!document.querySelector('[data-do=continue]')", "Save persists across Activity recreation");
            // AFTER_HOURS_NATIVE_030
            js("localStorage.removeItem('hotbox-cymra-v4'); document.querySelector('[data-ah=heroes]').click()");
            check("document.querySelectorAll('.hero-select').length===3", "Three campaign characters");
            js("document.querySelector('[data-hero=riz]').click(); document.querySelector('[data-ah=intro]').click()");
            check("!!document.querySelector('.story-frame')", "Story and goal briefing");
            js("document.querySelector('[data-ah=launch]').click()");
            check("AHUI.run().stage==='battle' && HotBoxUI.state().campaign.hero==='riz'", "Launch story encounter");
            js("document.querySelector('[data-do=draw]').click(); document.querySelector('[data-ah=skill]').click()");
            check("!!document.querySelector('.redraw-grid')", "Character ability selection");
            js("document.querySelectorAll('[data-ah=pick]')[1].click(); document.querySelector('[data-ah=redraw-go]').click()");
            check("HotBoxUI.state().players[0].skillUsed && HotBoxUI.state().phase==='act'", "Riz free redraw");
            java.util.concurrent.atomic.AtomicBoolean insetSafe = new java.util.concurrent.atomic.AtomicBoolean(false);
            runOnMainSync(() -> {
                int[] xy=new int[2]; activity.getGameWebView().getLocationOnScreen(xy);
                android.view.WindowInsets wi=activity.getWindow().getDecorView().getRootWindowInsets();
                int top=wi==null?0:wi.getSystemWindowInsetTop();
                insetSafe.set(xy[1]>=top && activity.getGameWebView().getHeight()>100);
                Log.i("HOTBOX_TEST","Inset top="+top+", web top="+xy[1]+", web height="+activity.getGameWebView().getHeight());
            });
            if(!insetSafe.get()) throw new AssertionError("Web content overlaps status bar");
            js("document.querySelector('[data-do=pausemenu]').click(); document.querySelector('[data-do=home]').click()");
            check("!!document.querySelector('[data-do=continue]') && !!document.querySelector('[data-ah=continue]')", "Separate Classic and campaign saves");
            runOnMainSync(() -> activity.finish()); waitForIdleSync();
            activity = (MainActivity)startActivitySync(intent); awaitPage();
            check("!!document.querySelector('[data-ah=continue]')", "Campaign persists after Activity recreation");
            js("document.querySelector('[data-ah=continue]').click()");
            check("AHUI.run().hero==='riz' && HotBoxUI.state().players[0].skillUsed && HotBoxUI.state().phase==='act'", "Campaign restores exact turn and used ability");


            check("AfterHours.tables.length===8 && document.querySelector('.campaign-hud').textContent.includes('1/8')", "Eight-table Cymra campaign");
            js("var s=HotBoxShell.get(),p=s.players[0];p.bank=35000;p.roundBank=35000;p.line=1;s.current=0;s.phase='act';var i=s.deck.findIndex(c=>c.id==='baggie');var c=s.deck.splice(i,1)[0];p.stash.push(c);HotBoxShell.perform({type:'bank',uid:c.uid});");
            check("AHUI.run().stage==='result' && AHUI.run().outcome.success && HotBoxUI.state().clearReason==='target'", "Target clears immediately without waiting for Raptor");
            js("document.querySelector('[data-ah=result-next]').click()");
            check("AHUI.run().stage==='shop' && AHUI.run().wallet===40000 && AHUI.run().score===40000", "Clear to shop and exact-once rewards");
            js("var buy=document.querySelector('[data-ah=buy]:not([disabled])');window.__price=AfterHours.items[buy.dataset.item].cost;buy.click()");
            check("AHUI.run().wallet===40000-window.__price && AHUI.run().score===40000", "Purchase spends wallet without reducing run score");
            js("document.querySelector('[data-ah=leave]').click();document.querySelector('[data-ah=intro]').click();document.querySelector('[data-ah=launch]').click()");
            check("AHUI.run().node===1 && HotBoxUI.state().campaign.target===65000", "Next real encounter launches");
            js("var s=HotBoxShell.get(),p=s.players[0];function take(id){return s.deck.splice(s.deck.findIndex(c=>c.id===id),1)[0];}p.hand.push(take('dash'),take('baggie'));s.current=1;s.phase='act';var raid=take('raid');s.players[1].hand.push(raid);HotBox.act(s,1,{type:'play',uid:raid.uid,target:0});HotBoxShell.rerender();");
            check("!!document.querySelector('.reaction-summary') && document.querySelectorAll('.sheet-actions button').length===3", "Compact three-choice reaction");
            js("document.querySelector('[data-do=dashpick]').click()");
            check("document.querySelectorAll('.sacrifice').length<=4 && document.querySelectorAll('.sacrifice').length>0", "Duplicate sacrifices are grouped by product");
            js("document.querySelector('.sacrifice').click()");
            check("!HotBoxUI.state().pending && HotBoxUI.state().players[0].raid===0", "Dash It cancels police hit");
            js("var s=HotBoxShell.get(),p=s.players[0];while(p.hand.length<8){var i=s.deck.findIndex(c=>c.id!=='raptor');p.hand.push(s.deck.splice(i,1)[0]);}while(p.hand.length>8)s.discard.push(p.hand.pop());s.current=0;s.phase='trim';s.trimNext='act';HotBoxShell.rerender();");
            check("document.getElementById('overlay').textContent.includes('Story hand limit: 7')", "Explicit Story hand-limit picker");
            js("document.querySelector('.sacrifice').click()");
            check("HotBoxUI.state().players[0].hand.length===7 && HotBoxUI.state().phase==='act'", "Trimming preserves the main action");
            check("Array.from(document.querySelectorAll('.card .comic')).length>0", "Comic artwork integrated into playable cards");
            check("document.documentElement.scrollWidth<=window.innerWidth+1", "No horizontal page overflow");
            result.putString("stream", "\nHOTBOX_SMOKE:PASS — Cymra 0.4: launch, art, classic, story, saves, insets, immediate clear, shop, reactions, trim\n");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable ex) {
            result.putString("stream", "\nHOTBOX_SMOKE:FAIL " + stage + ": " + ex.toString()+"\n");
            finish(Activity.RESULT_CANCELED,result);
        }
    }
}
