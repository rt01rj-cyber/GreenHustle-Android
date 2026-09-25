package uk.co.hotbox.cardgame;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Collections;

/** One bundled, offline origin. No bridge and no external navigation. */
public class MainActivity extends Activity {
    private WebView web;
    private static final String HOST = "hotbox.local";
    @Override public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        try {
            web = new WebView(this);
            web.setBackgroundColor(Color.rgb(11,17,26));
            // AFTER_HOURS_INSETS_030: resize child, do not merely pad WebView pixels.
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
            WebSettings settings = web.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setSupportMultipleWindows(true);
            settings.setTextZoom(100);
            settings.setMediaPlaybackRequiresUserGesture(true);
            web.setWebChromeClient(new WebChromeClient() {
                @Override public boolean onConsoleMessage(ConsoleMessage message) {
                    Log.i("HOTBOX", message.message() + " at " + message.lineNumber());
                    return true;
                }
            });
            web.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return !HOST.equals(request.getUrl().getHost());
                }
                @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    try {
                        if (!"https".equals(request.getUrl().getScheme()) || !HOST.equals(request.getUrl().getHost())) return denied();
                        String path = request.getUrl().getPath();
                        if (path == null || path.equals("/")) path = "/index.html";
                        if (path.contains("..") || !path.matches("/[a-zA-Z0-9_./-]+")) return denied();
                        InputStream stream = getAssets().open("www" + path);
                        String mime = path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".webp") ? "image/webp" : path.endsWith(".png") ? "image/png" : path.endsWith(".svg") ? "image/svg+xml" : "text/html";
                        WebResourceResponse response = new WebResourceResponse(mime, "UTF-8", stream);
                        response.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-store"));
                        return response;
                    } catch (Exception ex) { return denied(); }
                }
                @Override public void onPageFinished(WebView view, String url) {
                    view.evaluateJavascript("!!window.HotBoxUI && document.body.dataset.ready === '1'", value -> Log.i("HOTBOX", "READY=" + value));
                }
            });
            // Attach first. Startup avoids the early fullscreen/insets calls in the previous app.
            setContentView(frame);
            frame.requestApplyInsets();
            web.loadUrl("https://" + HOST + "/index.html");
        } catch (RuntimeException ex) { showError(ex); }
    }
    private WebResourceResponse denied() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void showError(Throwable error) {
        Log.e("HOTBOX", "Startup failed", error);
        TextView message = new TextView(this);
        message.setTextColor(Color.WHITE);
        message.setBackgroundColor(Color.rgb(11,17,26));
        message.setTextSize(17); message.setPadding(32,32,32,32); message.setGravity(Gravity.CENTER);
        message.setText("Hot Box could not start.\n\n" + error.getClass().getSimpleName() + "\n" + error.getMessage() + "\n\nTake a screenshot of this message. Your phone has not been accessed remotely.");
        setContentView(message);
    }
    public WebView getGameWebView() { return web; }
    @Override public void onPause() {
        if (web != null) { web.evaluateJavascript("window.HotBoxUI && HotBoxUI.pause()", null); web.onPause(); }
        super.onPause();
    }
    @Override public void onResume() {
        super.onResume();
        if (web != null) { web.onResume(); web.evaluateJavascript("window.HotBoxUI && HotBoxUI.resume()", null); }
    }
    @Override public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("window.HotBoxUI ? HotBoxUI.back() : false", result -> { if (!"true".equals(result)) finish(); });
    }
    @Override public void onDestroy() {
        if (web != null) {
            if (web.getParent() instanceof ViewGroup) ((ViewGroup)web.getParent()).removeView(web);
            web.destroy(); web = null;
        }
        super.onDestroy();
    }
}
