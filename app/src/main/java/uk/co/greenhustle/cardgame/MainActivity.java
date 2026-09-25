package uk.co.greenhustle.cardgame;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import android.view.Gravity;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        // Compatibility-first fullscreen: works on Android 8+ without
        // referencing Android 11-only WindowInsets APIs.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        try {
            webView = new WebView(this);
            webView.setBackgroundColor(Color.rgb(19, 37, 26));

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setTextZoom(100);

            webView.setWebViewClient(new WebViewClient());
            webView.loadUrl("file:///android_asset/www/index.html");
            setContentView(webView);
        } catch (Throwable t) {
            showFallback(t);
        }
    }

    private void showFallback(Throwable t) {
        TextView message = new TextView(this);
        message.setTextColor(Color.WHITE);
        message.setBackgroundColor(Color.rgb(19, 37, 26));
        message.setGravity(Gravity.CENTER);
        message.setPadding(40, 40, 40, 40);
        message.setTextSize(18);
        message.setText(
            "Green Hustle could not start its Android WebView.\n\n" +
            "Please update Android System WebView or Google Chrome, then reopen the app.\n\n" +
            "Technical detail: " + t.getClass().getSimpleName()
        );
        setContentView(message);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
