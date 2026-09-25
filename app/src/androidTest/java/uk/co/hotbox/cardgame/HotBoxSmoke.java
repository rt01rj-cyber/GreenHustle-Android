package uk.co.hotbox.cardgame;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import java.util.concurrent.atomic.AtomicReference;

/** Framework-only instrumentation: tests the actual installed APK, not an HTML mock. */
public class HotBoxSmoke extends Instrumentation {
    private MainActivity activity;
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private String js(String code) {
        AtomicReference<String> result = new AtomicReference<>();
        runOnMainSync(() -> activity.getGameWebView().evaluateJavascript(code, result::set));
        long until = SystemClock.uptimeMillis()+5000;
        while(result.get()==null && SystemClock.uptimeMillis()<until) SystemClock.sleep(50);
        if(result.get()==null) throw new AssertionError("JavaScript callback timed out");
        return result.get();
    }
    private void check(String expression, String label) {
        long until = SystemClock.uptimeMillis()+15000;
        do { if("true".equals(js(expression))) return; SystemClock.sleep(150); } while(SystemClock.uptimeMillis()<until);
        throw new AssertionError(label + " failed: " + js(expression));
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            Intent intent = new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity = (MainActivity) startActivitySync(intent);
            check("!!window.HotBoxUI && document.body.dataset.ready==='1'", "Launch and JavaScript boot");
            js("window.__atlasOK=false;var art=new Image();art.onload=function(){window.__atlasOK=art.naturalWidth>=512;};art.src='https://hotbox.local/art/atlas.webp';");
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
            check("!!document.querySelector('[data-do=continue]')", "Save persists across Activity recreation");
            result.putString("stream", "\nHOTBOX_SMOKE:PASS — launch, draw, inspect, save, resume, recreate\n");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable ex) {
            result.putString("stream", "\nHOTBOX_SMOKE:FAIL " + ex.toString()+"\n");
            finish(Activity.RESULT_CANCELED,result);
        }
    }
}
