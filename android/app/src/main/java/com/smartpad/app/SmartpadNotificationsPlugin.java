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

            Context context = getContext();

            // Create the notification
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_popup_reminder)
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

            // Create Snooze action (uses BroadcastReceiver, doesn't open app)
            Intent snoozeIntent = new Intent(context, NotificationActionReceiver.class);
            snoozeIntent.setAction(NotificationActionReceiver.ACTION_SNOOZE);
            snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_NOTE_ID, noteId);
            snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, id);

            int snoozeFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                snoozeFlags = snoozeFlags | PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                    context,
                    id + 1000, // Unique request code for snooze
                    snoozeIntent,
                    snoozeFlags);
            builder.addAction(0, "Snooze 5 min", snoozePendingIntent);

            // Create Mark Complete action (uses BroadcastReceiver, doesn't open app)
            if (showMarkComplete) {
                Intent markCompleteIntent = new Intent(context, NotificationActionReceiver.class);
                markCompleteIntent.setAction(NotificationActionReceiver.ACTION_MARK_COMPLETE);
                markCompleteIntent.putExtra(NotificationActionReceiver.EXTRA_NOTE_ID, noteId);
                markCompleteIntent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, id);

                int markCompleteFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    markCompleteFlags = markCompleteFlags | PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent markCompletePendingIntent = PendingIntent.getBroadcast(
                        context,
                        id + 2000, // Unique request code for mark complete
                        markCompleteIntent,
                        markCompleteFlags);
                builder.addAction(0, "Mark Complete", markCompletePendingIntent);
            }

            Notification notification = builder.build();

            // Schedule the notification
            if (triggerTime > System.currentTimeMillis()) {
                // Schedule for future
                scheduleAlarm(context, id, notification, triggerTime);
                Log.d(TAG, "Scheduled notification " + id + " for " + new Date(triggerTime));
            } else {
                // Show immediately
                NotificationManager notificationManager = (NotificationManager) context
                        .getSystemService(Context.NOTIFICATION_SERVICE);
                notificationManager.notify(id, notification);
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

    @PluginMethod
    public void cancelNotification(PluginCall call) {
        try {
            int id = call.getInt("id", 0);
            Context context = getContext();

            // Cancel the alarm
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, NotificationPublisher.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = flags | PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id, intent, flags);
            alarmManager.cancel(pendingIntent);

            // Cancel the notification if visible
            NotificationManager notificationManager = (NotificationManager) context
                    .getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(id);

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

    private void scheduleAlarm(Context context, int id, Notification notification, long triggerTime) {
        Intent intent = new Intent(context, NotificationPublisher.class);
        intent.putExtra(NotificationPublisher.NOTIFICATION_ID, id);
        intent.putExtra(NotificationPublisher.NOTIFICATION, notification);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags = flags | PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id, intent, flags);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            // Fall back to inexact alarm if exact alarms not allowed
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }
    }
}
