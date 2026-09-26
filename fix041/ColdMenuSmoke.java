package uk.co.hotbox.cardgame;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/** Runs after force-stop, against the installed APK. Empty WebView accessibility trees are not a proxy for a blank app. */
public class ColdMenuSmoke extends Instrumentation {
    private MainActivity activity;
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
    private String js(String expression) {
        AtomicReference<String> value = new AtomicReference<>();
        runOnMainSync(() -> activity.getGameWebView().evaluateJavascript(expression, value::set));
        long until = SystemClock.uptimeMillis()+15000;
        while(value.get()==null && SystemClock.uptimeMillis()<until) SystemClock.sleep(50);
        if(value.get()==null) throw new AssertionError("Cold-launch JavaScript did not respond");
        return value.get();
    }
    private void check(String expression, String label) {
        long until = SystemClock.uptimeMillis()+25000;
        do { if("true".equals(js(expression)))return;SystemClock.sleep(100); } while(SystemClock.uptimeMillis()<until);
        throw new AssertionError(label+": "+js(expression));
    }
    @Override public void onStart() {
        Bundle report = new Bundle();
        try {
            Intent launch = new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity=(MainActivity)startActivitySync(launch);
            AtomicBoolean ready=new AtomicBoolean(false);
            long until=SystemClock.uptimeMillis()+45000;
            do {
                runOnMainSync(() -> ready.set(activity.getGameWebView()!=null && activity.getGameWebView().getProgress()==100 && "https://hotbox.local/index.html".equals(activity.getGameWebView().getUrl())));
                if(ready.get())break;SystemClock.sleep(150);
            } while(SystemClock.uptimeMillis()<until);
            if(!ready.get())throw new AssertionError("Cold page did not finish loading");
            AtomicBoolean shown=new AtomicBoolean(false);
            runOnMainSync(() -> shown.set(activity.getGameWebView().isShown() && activity.getGameWebView().getWidth()>100 && activity.getGameWebView().getHeight()>100));
            if(!shown.get())throw new AssertionError("Native WebView not visible");
            check("(function(){var m=document.querySelector('.menu'),b=document.querySelector('[data-ah=heroes]');return !!m && !!b && !b.disabled && m.getBoundingClientRect().width>100 && getComputedStyle(m).display!=='none' && document.body.dataset.ready==='1';})()", "Visible interactive Story menu");
            js("document.querySelector('[data-ah=heroes]').click()");
            check("!document.getElementById('overlay').hidden && document.querySelectorAll('.hero-pick').length===3", "Cold-start menu opens the three operatives");
            js("document.querySelector('[data-do=close]').click()");
            check("document.getElementById('overlay').hidden && !!document.querySelector('[data-ah=heroes]')", "Return to menu");
            report.putString("stream","\nHOTBOX_COLD_VISIBLE_MENU:PASS — native surface, visible menu, operative selection, return\n");
            finish(Activity.RESULT_OK,report);
        } catch(Throwable failure) {
            report.putString("stream","\nHOTBOX_COLD_VISIBLE_MENU:FAIL "+failure.toString()+"\n");
            finish(Activity.RESULT_CANCELED,report);
        }
    }
}
