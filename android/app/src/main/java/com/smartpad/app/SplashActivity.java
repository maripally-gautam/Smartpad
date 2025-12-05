package com.smartpad.app;

import android.animation.ObjectAnimator;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {

    private static final int SPLASH_DURATION = 1800; // 1.8 seconds total
    private ProgressBar progressBar;
    private Handler handler;
    private int progress = 0;
    private boolean isFinishing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Determine theme before calling super.onCreate
        boolean isDarkTheme = isDarkThemeEnabled();

        // Set the appropriate theme
        if (isDarkTheme) {
            setTheme(R.style.AppTheme_SplashDark);
        } else {
            setTheme(R.style.AppTheme_SplashLight);
        }

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        // Apply theme colors programmatically
        applyThemeColors(isDarkTheme);

        // Get progress bar and start animation
        progressBar = findViewById(R.id.splash_progress);
        handler = new Handler(Looper.getMainLooper());

        // Start the loading animation
        startLoadingAnimation();
    }

    private void startLoadingAnimation() {
        // Use ObjectAnimator for smooth progress animation
        progressBar.setMax(100);
        progressBar.setProgress(0);

        // Create smooth animation from 0 to 100
        ObjectAnimator progressAnimator = ObjectAnimator.ofInt(progressBar, "progress", 0, 100);
        progressAnimator.setDuration(SPLASH_DURATION);
        progressAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
        progressAnimator.start();

        // Navigate to MainActivity when animation completes
        handler.postDelayed(() -> {
            if (!isFinishing) {
                navigateToMain();
            }
        }, SPLASH_DURATION);
    }

    private void navigateToMain() {
        isFinishing = true;
        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
        startActivity(intent);
        finish();
        // Smooth fade transition
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
    }

    private boolean isDarkThemeEnabled() {
        try {
            // Read the settings from Capacitor's SharedPreferences
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String settingsJson = prefs.getString("settings", null);

            if (settingsJson != null) {
                // Simple JSON parsing for theme value
                if (settingsJson.contains("\"theme\":\"dark\"")) {
                    return true;
                } else if (settingsJson.contains("\"theme\":\"light\"")) {
                    return false;
                }
            }
        } catch (Exception e) {
            // Default to dark theme on error
            e.printStackTrace();
        }

        // Default to dark theme if no preference is set
        return true;
    }

    private void applyThemeColors(boolean isDarkTheme) {
        RelativeLayout rootLayout = findViewById(R.id.splash_root);
        TextView splashText = findViewById(R.id.splash_text);
        ProgressBar progressBar = findViewById(R.id.splash_progress);

        if (isDarkTheme) {
            // Dark theme colors
            rootLayout.setBackgroundColor(Color.parseColor("#0F172A"));
            splashText.setTextColor(Color.parseColor("#F8FAFC"));

            // Set status bar color
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0F172A"));
            window.setNavigationBarColor(Color.parseColor("#0F172A"));

            // Dark status bar icons
            View decorView = window.getDecorView();
            decorView.setSystemUiVisibility(0);
        } else {
            // Light theme colors
            rootLayout.setBackgroundColor(Color.parseColor("#FFFFFF"));
            splashText.setTextColor(Color.parseColor("#0F172A"));

            // Set status bar color with light status bar icons
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#FFFFFF"));
            window.setNavigationBarColor(Color.parseColor("#FFFFFF"));

            // Set light status bar (dark icons)
            View decorView = window.getDecorView();
            decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
    }
}
