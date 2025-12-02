package com.smartpad.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BroadcastReceiver that publishes scheduled notifications at the specified
 * time.
 */
public class NotificationPublisher extends BroadcastReceiver {
    private static final String TAG = "NotificationPublisher";

    public static final String NOTIFICATION_ID = "notification_id";
    public static final String NOTIFICATION = "notification";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);

        Notification notification = intent.getParcelableExtra(NOTIFICATION);
        int id = intent.getIntExtra(NOTIFICATION_ID, 0);

        if (notification != null) {
            notificationManager.notify(id, notification);
            Log.d(TAG, "Published notification " + id);
        } else {
            Log.e(TAG, "Notification was null for id " + id);
        }
    }
}
