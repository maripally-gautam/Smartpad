package com.smartpad.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Date;

/**
 * BroadcastReceiver that handles:
 * 1. When a notification fires - shows it and reschedules if repeating
 * 2. When device boots - reschedules all pending notifications
 * 
 * This ensures repeating notifications continue even when the app is not open.
 */
public class RepeatingNotificationScheduler extends BroadcastReceiver {
    private static final String TAG = "RepeatingNotifScheduler";

    public static final String ACTION_SHOW_NOTIFICATION = "com.smartpad.app.ACTION_SHOW_NOTIFICATION";
    public static final String ACTION_BOOT_COMPLETED = "android.intent.action.BOOT_COMPLETED";

    public static final String EXTRA_NOTIFICATION_ID = "notification_id";
    public static final String EXTRA_NOTE_ID = "note_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_REPEAT_TYPE = "repeat_type";
    public static final String EXTRA_CUSTOM_DAYS = "custom_days";
    public static final String EXTRA_CUSTOM_MINUTES = "custom_minutes";
    public static final String EXTRA_SHOW_MARK_COMPLETE = "show_mark_complete";

    // SharedPreferences key for notes (matches the web app's localStorage key)
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String NOTES_KEY = "notes";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received action: " + action);

        if (ACTION_BOOT_COMPLETED.equals(action)) {
            // Device rebooted - reschedule all notifications from stored notes
            rescheduleAllNotifications(context);
        } else if (ACTION_SHOW_NOTIFICATION.equals(action)) {
            // Notification triggered - show it and reschedule if repeating
            handleNotificationTrigger(context, intent);
        }
    }

    /**
     * Handle when a scheduled notification fires
     */
    private void handleNotificationTrigger(Context context, Intent intent) {
        int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0);
        String noteId = intent.getStringExtra(EXTRA_NOTE_ID);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        String repeatType = intent.getStringExtra(EXTRA_REPEAT_TYPE);
        int customDays = intent.getIntExtra(EXTRA_CUSTOM_DAYS, 0);
        int customMinutes = intent.getIntExtra(EXTRA_CUSTOM_MINUTES, 0);
        boolean showMarkComplete = intent.getBooleanExtra(EXTRA_SHOW_MARK_COMPLETE, true);

        Log.d(TAG, "Showing notification " + notificationId + " for note " + noteId + ", repeat: " + repeatType);

        // Show the notification
        showNotification(context, notificationId, noteId, title, body, showMarkComplete);

        // If it's a repeating notification, schedule the next one
        if (repeatType != null && !repeatType.equals("none")) {
            long nextTriggerTime = calculateNextTriggerTime(repeatType, customDays, customMinutes);
            if (nextTriggerTime > 0) {
                scheduleNotification(context, notificationId, noteId, title, body,
                        nextTriggerTime, repeatType, customDays, customMinutes, showMarkComplete);

                // Update the note's reminder time in SharedPreferences
                updateNoteReminderTime(context, noteId, nextTriggerTime);

                Log.d(TAG, "Rescheduled notification " + notificationId + " for " + new Date(nextTriggerTime));
            }
        } else {
            // Non-repeating - remove the reminder from the note
            removeNoteReminder(context, noteId);
        }
    }

    /**
     * Show a notification immediately - simple notification without action buttons
     */
    private void showNotification(Context context, int notificationId, String noteId,
            String title, String body, boolean showMarkComplete) {

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        // Create intent for when user taps the notification (opens app)
        Intent tapIntent = new Intent(context, MainActivity.class);
        tapIntent.setAction(Intent.ACTION_MAIN);
        tapIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tapIntent.putExtra("noteId", noteId);
        tapIntent.putExtra("notificationId", notificationId);

        int tapFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            tapFlags = tapFlags | PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent tapPendingIntent = PendingIntent.getActivity(context, notificationId, tapIntent, tapFlags);
        builder.setContentIntent(tapPendingIntent);

        // Note: Removed Snooze and Mark Complete action buttons as they require
        // app to be running for proper functionality with repeating reminders

        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(notificationId, builder.build());
    }

    /**
     * Calculate the next trigger time based on repeat type
     */
    private long calculateNextTriggerTime(String repeatType, int customDays, int customMinutes) {
        Calendar calendar = Calendar.getInstance();

        switch (repeatType) {
            case "hourly":
                calendar.add(Calendar.HOUR_OF_DAY, 1);
                break;
            case "daily":
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                break;
            case "weekly":
                calendar.add(Calendar.WEEK_OF_YEAR, 1);
                break;
            case "monthly":
                calendar.add(Calendar.MONTH, 1);
                break;
            case "yearly":
                calendar.add(Calendar.YEAR, 1);
                break;
            case "custom":
                int totalMinutes = (customDays * 24 * 60) + customMinutes;
                int finalMinutes = totalMinutes < 5 ? 5 : totalMinutes;
                calendar.add(Calendar.MINUTE, finalMinutes);
                break;
            default:
                return 0;
        }

        return calendar.getTimeInMillis();
    }

    /**
     * Schedule a notification using AlarmManager
     */
    public static void scheduleNotification(Context context, int notificationId, String noteId,
            String title, String body, long triggerTime, String repeatType,
            int customDays, int customMinutes, boolean showMarkComplete) {

        Intent intent = new Intent(context, RepeatingNotificationScheduler.class);
        intent.setAction(ACTION_SHOW_NOTIFICATION);
        intent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
        intent.putExtra(EXTRA_NOTE_ID, noteId);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_BODY, body);
        intent.putExtra(EXTRA_REPEAT_TYPE, repeatType != null ? repeatType : "none");
        intent.putExtra(EXTRA_CUSTOM_DAYS, customDays);
        intent.putExtra(EXTRA_CUSTOM_MINUTES, customMinutes);
        intent.putExtra(EXTRA_SHOW_MARK_COMPLETE, showMarkComplete);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags = flags | PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, flags);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }

        Log.d(TAG, "Scheduled notification " + notificationId + " for " + new Date(triggerTime));
    }

    /**
     * Cancel a scheduled notification
     */
    public static void cancelNotification(Context context, int notificationId) {
        Intent intent = new Intent(context, RepeatingNotificationScheduler.class);
        intent.setAction(ACTION_SHOW_NOTIFICATION);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags = flags | PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, flags);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        alarmManager.cancel(pendingIntent);

        // Also cancel any visible notification
        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(notificationId);

        Log.d(TAG, "Cancelled notification " + notificationId);
    }

    /**
     * Update the note's reminder time in SharedPreferences
     */
    private void updateNoteReminderTime(Context context, String noteId, long newTime) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String notesJson = prefs.getString(NOTES_KEY, "[]");

            JSONArray notes = new JSONArray(notesJson);
            boolean updated = false;

            for (int i = 0; i < notes.length(); i++) {
                JSONObject note = notes.getJSONObject(i);
                if (noteId.equals(note.getString("id"))) {
                    if (note.has("reminder") && !note.isNull("reminder")) {
                        JSONObject reminder = note.getJSONObject("reminder");
                        reminder.put("time", formatISODate(new Date(newTime)));
                        note.put("reminder", reminder);
                        note.put("lastModified", formatISODate(new Date()));
                        updated = true;
                        Log.d(TAG, "Updated note reminder time to " + formatISODate(new Date(newTime)));
                    }
                    break;
                }
            }

            if (updated) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(NOTES_KEY, notes.toString());
                editor.apply();
            }

        } catch (Exception e) {
            Log.e(TAG, "Error updating note reminder time", e);
        }
    }

    /**
     * Remove the reminder from a note in SharedPreferences
     */
    private void removeNoteReminder(Context context, String noteId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String notesJson = prefs.getString(NOTES_KEY, "[]");

            JSONArray notes = new JSONArray(notesJson);
            boolean updated = false;

            for (int i = 0; i < notes.length(); i++) {
                JSONObject note = notes.getJSONObject(i);
                if (noteId.equals(note.getString("id"))) {
                    note.remove("reminder");
                    note.put("lastModified", formatISODate(new Date()));
                    updated = true;
                    Log.d(TAG, "Removed reminder from note " + noteId);
                    break;
                }
            }

            if (updated) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(NOTES_KEY, notes.toString());
                editor.apply();
            }

        } catch (Exception e) {
            Log.e(TAG, "Error removing note reminder", e);
        }
    }

    /**
     * Reschedule all notifications after device boot
     */
    private void rescheduleAllNotifications(Context context) {
        Log.d(TAG, "Rescheduling all notifications after boot");

        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String notesJson = prefs.getString(NOTES_KEY, "[]");

            JSONArray notes = new JSONArray(notesJson);
            int scheduledCount = 0;

            for (int i = 0; i < notes.length(); i++) {
                JSONObject note = notes.getJSONObject(i);

                if (note.has("reminder") && !note.isNull("reminder")) {
                    JSONObject reminder = note.getJSONObject("reminder");
                    String timeStr = reminder.getString("time");
                    String repeatType = reminder.optString("repeat", "none");
                    int customDays = reminder.optInt("customDays", 0);
                    int customMinutes = reminder.optInt("customMinutes", 0);

                    // Parse the ISO date
                    Date reminderDate = parseISODate(timeStr);
                    if (reminderDate == null)
                        continue;

                    long triggerTime = reminderDate.getTime();
                    long now = System.currentTimeMillis();

                    // If the time is in the past and it's repeating, calculate next occurrence
                    if (triggerTime <= now && repeatType != null && !repeatType.equals("none")) {
                        while (triggerTime <= now) {
                            Calendar calendar = Calendar.getInstance();
                            calendar.setTimeInMillis(triggerTime);

                            switch (repeatType) {
                                case "hourly":
                                    calendar.add(Calendar.HOUR_OF_DAY, 1);
                                    break;
                                case "daily":
                                    calendar.add(Calendar.DAY_OF_MONTH, 1);
                                    break;
                                case "weekly":
                                    calendar.add(Calendar.WEEK_OF_YEAR, 1);
                                    break;
                                case "monthly":
                                    calendar.add(Calendar.MONTH, 1);
                                    break;
                                case "yearly":
                                    calendar.add(Calendar.YEAR, 1);
                                    break;
                                case "custom":
                                    int totalMinutes = (customDays * 24 * 60) + customMinutes;
                                    int finalMinutes = totalMinutes < 5 ? 5 : totalMinutes;
                                    calendar.add(Calendar.MINUTE, finalMinutes);
                                    break;
                            }

                            triggerTime = calendar.getTimeInMillis();
                        }

                        // Update the note with the new time
                        reminder.put("time", formatISODate(new Date(triggerTime)));
                        note.put("reminder", reminder);
                    }

                    // Only schedule if in the future
                    if (triggerTime > now) {
                        String noteId = note.getString("id");
                        String title = note.getString("title");
                        String content = note.optString("content", "");

                        // Clean content for notification body
                        String body = content
                                .replaceAll("&nbsp;", " ")
                                .replaceAll("<[^>]*>", " ")
                                .replaceAll("\\s+", " ")
                                .trim();
                        if (body.length() > 100) {
                            body = body.substring(0, 100);
                        }
                        if (body.isEmpty()) {
                            body = "Reminder for your note";
                        }

                        int notificationId = generateNotificationId(noteId);

                        scheduleNotification(context, notificationId, noteId, title, body,
                                triggerTime, repeatType, customDays, customMinutes, true);

                        scheduledCount++;
                    }
                }
            }

            // Save any updated times
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(NOTES_KEY, notes.toString());
            editor.apply();

            Log.d(TAG, "Rescheduled " + scheduledCount + " notifications after boot");

        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling notifications after boot", e);
        }
    }

    /**
     * Generate a unique notification ID based on note ID hash
     */
    private static int generateNotificationId(String noteId) {
        int hash = 0;
        for (int i = 0; i < noteId.length(); i++) {
            char c = noteId.charAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Format a Date object to ISO 8601 string format
     */
    private String formatISODate(Date date) {
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return sdf.format(date);
    }

    /**
     * Parse an ISO 8601 date string to Date object
     */
    private Date parseISODate(String dateStr) {
        try {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            return sdf.parse(dateStr);
        } catch (Exception e) {
            // Try without milliseconds
            try {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
                sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                return sdf.parse(dateStr);
            } catch (Exception e2) {
                Log.e(TAG, "Error parsing date: " + dateStr, e2);
                return null;
            }
        }
    }
}
