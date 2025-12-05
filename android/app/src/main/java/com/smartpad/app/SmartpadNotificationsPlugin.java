package com.smartpad.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;

/**
 * Custom Capacitor plugin for scheduling notifications with background action
 * support.
 * This plugin creates notifications with action buttons that use
 * BroadcastReceiver
 * instead of launching the app.
 * 
 * Now uses RepeatingNotificationScheduler for proper repeating notification
 * support.
 */
@CapacitorPlugin(name = "SmartpadNotifications")
public class SmartpadNotificationsPlugin extends Plugin {
    private static final String TAG = "SmartpadNotifications";

    @PluginMethod
    public void scheduleNotification(PluginCall call) {
        try {
            int id = call.getInt("id", 0);
            String title = call.getString("title", "");
            String body = call.getString("body", "");
            String noteId = call.getString("noteId", "");
            long triggerTime = call.getLong("triggerTime", 0L);
            boolean showMarkComplete = call.getBoolean("showMarkComplete", true);

            // Get repeat settings for proper repeating notification support
            String repeatType = call.getString("repeatType", "none");
            int customDays = call.getInt("customDays", 0);
            int customMinutes = call.getInt("customMinutes", 0);

            Context context = getContext();

            if (triggerTime > System.currentTimeMillis()) {
                // Use the RepeatingNotificationScheduler for future notifications
                // This ensures repeating notifications work even when app is closed
                RepeatingNotificationScheduler.scheduleNotification(
                        context, id, noteId, title, body, triggerTime,
                        repeatType, customDays, customMinutes, showMarkComplete);
                Log.d(TAG,
                        "Scheduled notification " + id + " via RepeatingNotificationScheduler, repeat: " + repeatType);
            } else {
                // Show immediately using the old method for backward compatibility
                showNotificationImmediately(context, id, noteId, title, body, showMarkComplete);
                Log.d(TAG, "Showed notification " + id + " immediately");
            }

            JSObject result = new JSObject();
            result.put("id", id);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error scheduling notification", e);
            call.reject("Failed to schedule notification: " + e.getMessage());
        }
    }

    /**
     * Show a notification immediately - simple notification without action buttons
     */
    private void showNotificationImmediately(Context context, int id, String noteId,
            String title, String body, boolean showMarkComplete) {

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_gemini_generated_image_1g4e9r1g4e9r1g4e_1)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        // Create intent for when user taps the notification body (opens app)
        Intent tapIntent = new Intent(context, MainActivity.class);
        tapIntent.setAction(Intent.ACTION_MAIN);
        tapIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tapIntent.putExtra("noteId", noteId);
        tapIntent.putExtra("notificationId", id);

        int tapFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            tapFlags = tapFlags | PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent tapPendingIntent = PendingIntent.getActivity(context, id, tapIntent, tapFlags);
        builder.setContentIntent(tapPendingIntent);

        // Note: Removed Snooze and Mark Complete action buttons for simpler
        // notifications

        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(id, builder.build());
    }

    @PluginMethod
    public void cancelNotification(PluginCall call) {
        try {
            int id = call.getInt("id", 0);
            Context context = getContext();

            // Use the RepeatingNotificationScheduler to cancel
            RepeatingNotificationScheduler.cancelNotification(context, id);

            Log.d(TAG, "Cancelled notification " + id);
            call.resolve();

        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notification", e);
            call.reject("Failed to cancel notification: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAllNotifications(PluginCall call) {
        try {
            Context context = getContext();
            NotificationManager notificationManager = (NotificationManager) context
                    .getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancelAll();

            Log.d(TAG, "Cancelled all notifications");
            call.resolve();

        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all notifications", e);
            call.reject("Failed to cancel all notifications: " + e.getMessage());
        }
    }
}
