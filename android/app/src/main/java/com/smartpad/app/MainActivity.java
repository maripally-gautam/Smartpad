package com.smartpad.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String CHANNEL_ID = "smartpad_reminders";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before calling super.onCreate
        registerPlugin(SmartpadNotificationsPlugin.class);

        super.onCreate(savedInstanceState);

        // Create notification channel for Android 8.0+
        createNotificationChannel();

        // Set soft input mode to resize the activity when keyboard appears
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Manual override: Force padding for system bars
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content),
                (v, insets) -> {
                    androidx.core.graphics.Insets systemBars = insets
                            .getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());
                    v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
                    return androidx.core.view.WindowInsetsCompat.CONSUMED;
                });
    }

    private void createNotificationChannel() {
        // Create the NotificationChannel only on API 26+ (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Smartpad Reminders";
            String description = "Notification channel for Smartpad note reminders";
            // IMPORTANCE_HIGH enables heads-up notifications (pop-up on screen)
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            // Enable vibration for the channel
            channel.enableVibration(true);
            // Enable lights
            channel.enableLights(true);
            // Set the vibration pattern
            channel.setVibrationPattern(new long[] { 0, 250, 250, 250 });
            // Show badge on app icon
            channel.setShowBadge(true);
            // Lock screen visibility
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            // Register the channel with the system
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
