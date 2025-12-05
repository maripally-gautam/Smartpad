package com.smartpad.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Date;

/**
 * BroadcastReceiver to handle notification actions (Snooze, Mark Complete)
 * without opening the app. This receiver processes the action and updates
 * the notes in SharedPreferences/localStorage.
 */
public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationActionReceiver";

    public static final String ACTION_SNOOZE = "com.smartpad.app.ACTION_SNOOZE";
    public static final String ACTION_MARK_COMPLETE = "com.smartpad.app.ACTION_MARK_COMPLETE";

    public static final String EXTRA_NOTE_ID = "noteId";
    public static final String EXTRA_NOTIFICATION_ID = "notificationId";

    // SharedPreferences key for notes (matches the web app's localStorage key)
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String NOTES_KEY = "notes";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String noteId = intent.getStringExtra(EXTRA_NOTE_ID);
        int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1);

        Log.d(TAG, "Received action: " + action + " for noteId: " + noteId);

        if (noteId == null || noteId.isEmpty()) {
            Log.e(TAG, "No noteId provided");
            return;
        }

        // Dismiss the notification
        if (notificationId != -1) {
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.cancel(notificationId);
        }

        // Process the action
        if (ACTION_SNOOZE.equals(action)) {
            handleSnooze(context, noteId, notificationId);
        } else if (ACTION_MARK_COMPLETE.equals(action)) {
            handleMarkComplete(context, noteId, notificationId);
        }
    }

    /**
     * Generate a unique notification ID based on note ID hash
     */
    private int generateNotificationId(String noteId) {
        int hash = 0;
        for (int i = 0; i < noteId.length(); i++) {
            char c = noteId.charAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Handle snooze action - reschedule the reminder for 5 minutes from now
     */
    private void handleSnooze(Context context, String noteId, int notificationId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String notesJson = prefs.getString(NOTES_KEY, "[]");

            JSONArray notes = new JSONArray(notesJson);
            boolean updated = false;
            String title = "";
            String body = "";
            String repeatType = "none";
            int customDays = 0;
            int customMinutes = 0;

            for (int i = 0; i < notes.length(); i++) {
                JSONObject note = notes.getJSONObject(i);
                if (noteId.equals(note.getString("id"))) {
                    // Get note info for the notification
                    title = note.optString("title", "Reminder");
                    String content = note.optString("content", "");
                    body = content
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

                    // Create snooze reminder (5 minutes from now)
                    Date snoozeTime = new Date();
                    snoozeTime.setTime(snoozeTime.getTime() + (5 * 60 * 1000)); // 5 minutes in milliseconds

                    JSONObject reminder = new JSONObject();

                    // Preserve existing reminder settings if available
                    if (note.has("reminder") && !note.isNull("reminder")) {
                        JSONObject existingReminder = note.getJSONObject("reminder");
                        repeatType = existingReminder.optString("repeat", "none");
                        customDays = existingReminder.optInt("customDays", 0);
                        customMinutes = existingReminder.optInt("customMinutes", 0);

                        reminder.put("repeat", repeatType);
                        if (customDays > 0) {
                            reminder.put("customDays", customDays);
                        }
                        if (customMinutes > 0) {
                            reminder.put("customMinutes", customMinutes);
                        }
                    } else {
                        reminder.put("repeat", "none");
                    }

                    reminder.put("time", formatISODate(snoozeTime));
                    reminder.put("markAsCompleted", false);

                    note.put("reminder", reminder);
                    note.put("lastModified", formatISODate(new Date()));

                    updated = true;

                    // Schedule the snooze notification using RepeatingNotificationScheduler
                    int scheduleNotifId = notificationId > 0 ? notificationId : generateNotificationId(noteId);
                    RepeatingNotificationScheduler.scheduleNotification(
                            context, scheduleNotifId, noteId, title, body,
                            snoozeTime.getTime(), repeatType, customDays, customMinutes, true);

                    Log.d(TAG, "Snoozed note: " + noteId + " to " + formatISODate(snoozeTime));
                    break;
                }
            }

            if (updated) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(NOTES_KEY, notes.toString());
                editor.apply();
                Log.d(TAG, "Notes updated in SharedPreferences");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error handling snooze", e);
        }
    }

    /**
     * Handle mark complete action - remove the reminder from the note and cancel
     * any scheduled notifications
     */
    private void handleMarkComplete(Context context, String noteId, int notificationId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String notesJson = prefs.getString(NOTES_KEY, "[]");

            JSONArray notes = new JSONArray(notesJson);
            boolean updated = false;

            for (int i = 0; i < notes.length(); i++) {
                JSONObject note = notes.getJSONObject(i);
                if (noteId.equals(note.getString("id"))) {
                    // Remove the reminder
                    note.remove("reminder");
                    note.put("lastModified", formatISODate(new Date()));

                    // Cancel any scheduled repeating notifications
                    int cancelNotifId = notificationId > 0 ? notificationId : generateNotificationId(noteId);
                    RepeatingNotificationScheduler.cancelNotification(context, cancelNotifId);

                    updated = true;
                    Log.d(TAG, "Marked complete note: " + noteId);
                    break;
                }
            }

            if (updated) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(NOTES_KEY, notes.toString());
                editor.apply();
                Log.d(TAG, "Notes updated in SharedPreferences");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error handling mark complete", e);
        }
    }

    /**
     * Format a Date object to ISO 8601 string format
     */
    private String formatISODate(Date date) {
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return sdf.format(date);
    }
}
