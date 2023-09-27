package com.emekalites.react.alarm.notification;

import android.app.AlarmManager;
import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.os.Build;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Iterator;

import static com.emekalites.react.alarm.notification.Constants.ADD_INTENT;
import static com.emekalites.react.alarm.notification.Constants.NOTIFICATION_ACTION_DISMISS;
import static com.emekalites.react.alarm.notification.Constants.NOTIFICATION_ACTION_SNOOZE;

class AlarmUtil {

    private static final long[] DEFAULT_VIBRATE_PATTERN = {0, 250, 250, 250};
    private int defaultFlags = 0;

    private final Context context;
    private final AlarmDatabase alarmDB;

    AlarmUtil(Application context) {
        this.context = context;
        this.alarmDB =  new AlarmDatabase(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            defaultFlags = PendingIntent.FLAG_IMMUTABLE;
        }
    }

    private Class<?> getMainActivityClass() {
        try {
            String packageName = context.getPackageName();
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(packageName);
            String className = launchIntent.getComponent().getClassName();
            Log.d(Constants.TAG, "main activity classname: " + className);
            return Class.forName(className);
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not load main activity class", e);
            return null;
        }
    }

    private AlarmManager getAlarmManager() {
        return (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    }

    private NotificationManager getNotificationManager() {
        return (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    boolean checkAlarm(ArrayList<AlarmModel> alarms, AlarmModel alarm) {
        for (AlarmModel aAlarm : alarms) {
            if (aAlarm.isSameTime(alarm) && aAlarm.getActive() == 1) {
                Toast.makeText(context, "You have already set this Alarm", Toast.LENGTH_SHORT).show();
                return true;
            }
        }
        return false;
    }

    void setBootReceiver() {
        ArrayList<AlarmModel> alarms = alarmDB.getAlarmList(1);
        if (alarms.size() > 0) {
            enableBootReceiver(context);
        } else {
            disableBootReceiver(context);
        }
    }

    void setAlarm(AlarmModel alarm) {
        Log.i(Constants.TAG, "Set alarm " + alarm);

        Calendar calendar = alarm.getAlarmDateTime();
        int alarmId = alarm.getAlarmId();

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("intentType", ADD_INTENT);
        intent.putExtra("PendingId", alarm.getId());

        PendingIntent alarmIntent = PendingIntent.getBroadcast(context, alarmId, intent, defaultFlags);
        AlarmManager alarmManager = this.getAlarmManager();

        String scheduleType = alarm.getScheduleType();

        if (scheduleType.equals("once")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), alarmIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), alarmIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), alarmIntent);
            }
        } else if (scheduleType.equals("repeat")) {
            long interval = this.getInterval(alarm.getInterval(), alarm.getIntervalValue());
            alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), interval, alarmIntent);
        } else {
            Log.w(Constants.TAG, "Schedule type should either be once or repeat");
            return;
        }

        this.setBootReceiver();
    }

    void snoozeAlarm(AlarmModel alarm) {
        Log.i(Constants.TAG, "Snooze alarm: " + alarm.toString());

        Calendar calendar = alarm.snooze();

        long time = System.currentTimeMillis() / 1000;

        alarm.setAlarmId((int) time);
        // TODO looks like this sets a new id and then tries to update the row in DB
        // how's that supposed to work?
        alarmDB.update(alarm);

        int alarmId = alarm.getAlarmId();

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("intentType", ADD_INTENT);
        intent.putExtra("PendingId", alarm.getId());

        PendingIntent alarmIntent = PendingIntent.getBroadcast(context, alarmId, intent, defaultFlags);
        AlarmManager alarmManager = this.getAlarmManager();

        String scheduleType = alarm.getScheduleType();

        if (scheduleType.equals("once")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), alarmIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), alarmIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), alarmIntent);
            }
        } else if (scheduleType.equals("repeat")) {
            long interval = this.getInterval(alarm.getInterval(), alarm.getIntervalValue());

            alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), interval, alarmIntent);
        } else {
            Log.w(Constants.TAG, "Schedule type should either be once or repeat");
        }
    }

    long getInterval(String interval, int value) {
        long duration = 1;

        switch (interval) {
            case "minutely":
                duration = value;
                break;
            case "hourly":
                duration = 60 * value;
                break;
            case "daily":
                duration = 60 * 24;
                break;
            case "weekly":
                duration = 60 * 24 * 7;
                break;
        }

        return duration * 60 * 1000;
    }

    void doCancelAlarm(int id) {
        try {
            AlarmModel alarm = alarmDB.getAlarm(id);
            this.cancelAlarm(alarm, false);
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not cancel alarm with id " + id, e);
        }
    }

    void deleteAlarm(int id) {
        try {
            AlarmModel alarm = alarmDB.getAlarm(id);
            this.cancelAlarm(alarm, true);
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not delete alarm with id " + id, e);
        }
    }

    void deleteRepeatingAlarm(int id) {
        try {
            AlarmModel alarm = alarmDB.getAlarm(id);

            String scheduleType = alarm.getScheduleType();
            if (scheduleType.equals("repeat")) {
                this.stopAlarm(alarm);
            }
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not delete repeating alarm with id " + id, e);
        }
    }

    void cancelAlarm(AlarmModel alarm, boolean delete) {
        String scheduleType = alarm.getScheduleType();
        if (scheduleType.equals("once") || delete) {
            this.stopAlarm(alarm);
        }
    }

    void stopAlarm(AlarmModel alarm) {
        AlarmManager alarmManager = this.getAlarmManager();

        int alarmId = alarm.getAlarmId();

        Intent intent = new Intent(context, AlarmReceiver.class);
        PendingIntent alarmIntent = PendingIntent.getBroadcast(context, alarmId, intent, defaultFlags | PendingIntent.FLAG_UPDATE_CURRENT);
        alarmManager.cancel(alarmIntent);

        alarmDB.delete(alarm.getId());

        this.setBootReceiver();
    }

    private void enableBootReceiver(Context context) {
        ComponentName receiver = new ComponentName(context, AlarmBootReceiver.class);
        PackageManager pm = context.getPackageManager();

        int setting = pm.getComponentEnabledSetting(receiver);
        if (setting == PackageManager.COMPONENT_ENABLED_STATE_DISABLED ||
                setting == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) {
            Log.i(Constants.TAG, "Enable boot receiver");
            pm.setComponentEnabledSetting(receiver,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP);
        } else {
            Log.i(Constants.TAG, "Boot receiver already enabled");
        }
    }

    private void disableBootReceiver(Context context) {
        Log.i(Constants.TAG, "Disable boot receiver");

        ComponentName receiver = new ComponentName(context, AlarmBootReceiver.class);
        PackageManager pm = context.getPackageManager();

        pm.setComponentEnabledSetting(receiver,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP);
    }

    private PendingIntent createOnDismissedIntent(Context context, int notificationId) {
        Intent intent = new Intent(context, AlarmDismissReceiver.class);
        intent.putExtra(Constants.NOTIFICATION_ID, notificationId);
        return PendingIntent.getBroadcast(context.getApplicationContext(), notificationId, intent, defaultFlags);
    }

    void sendNotification(AlarmModel alarm) {
        try {
            Class<?> intentClass = getMainActivityClass();

            if (intentClass == null) {
                Log.e(Constants.TAG, "No activity class found for the notification");
                return;
            }

            NotificationManager mNotificationManager = getNotificationManager();
            int notificationID = alarm.getAlarmId();

            // title
            String title = alarm.getTitle();
            if (title == null || title.equals("")) {
                ApplicationInfo appInfo = context.getApplicationInfo();
                title = context.getPackageManager().getApplicationLabel(appInfo).toString();
            }

            // message
            // TODO move to AlarmModel constructor?
            String message = alarm.getMessage();
            if (message == null || message.equals("")) {
                Log.e(Constants.TAG, "Cannot send to notification centre because there is no 'message' found");
                return;
            }

            // channel
            // TODO move to AlarmModel constructor?
            String channelID = alarm.getChannel();
            if (channelID == null || channelID.equals("")) {
                Log.e(Constants.TAG, "Cannot send to notification centre because there is no 'channel' found");
                return;
            }

            Resources res = context.getResources();
            String packageName = context.getPackageName();

            //icon
            // TODO move to AlarmModel constructor?
            int smallIconResId;
            String smallIcon = alarm.getSmallIcon();
            if (smallIcon != null && !smallIcon.equals("")) {
                smallIconResId = res.getIdentifier(smallIcon, "mipmap", packageName);
            } else {
                smallIconResId = res.getIdentifier("ic_launcher", "mipmap", packageName);
            }

            Intent intent = new Intent(context, intentClass);
            intent.setAction(Constants.NOTIFICATION_ACTION_CLICK);
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

            intent.putExtra(Constants.NOTIFICATION_ID, alarm.getId());
            intent.putExtra("data", alarm.getData());

            PendingIntent pendingIntent = PendingIntent.getActivity(context, notificationID, intent, defaultFlags | PendingIntent.FLAG_UPDATE_CURRENT);

            NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(context, channelID)
                    .setSmallIcon(smallIconResId)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setTicker(alarm.getTicker())
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setAutoCancel(alarm.isAutoCancel())
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setSound(null)
                    .setDeleteIntent(createOnDismissedIntent(context, alarm.getId()));

            if (alarm.isPlaySound()) {
                // TODO use user-supplied sound if available
                mBuilder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), AudioManager.STREAM_NOTIFICATION);
            }

            long vibration = alarm.getVibration();

            long[] vibrationPattern = vibration == 0 ? DEFAULT_VIBRATE_PATTERN : new long[]{0, vibration, 1000, vibration};

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel mChannel = new NotificationChannel(channelID, "Alarm Notify", NotificationManager.IMPORTANCE_HIGH);
                mChannel.enableLights(true);

                String color = alarm.getColor();
                if (color != null && !color.equals("")) {
                    mChannel.setLightColor(Color.parseColor(color));
                }

                if (mChannel.canBypassDnd()) {
                    mChannel.setBypassDnd(alarm.isBypassDnd());
                }

                if (alarm.isVibrate()) {
                    mChannel.setVibrationPattern(vibrationPattern);
                    mChannel.enableVibration(true);
                }

                mNotificationManager.createNotificationChannel(mChannel);
                mBuilder.setChannelId(channelID);
            } else {
                // set vibration
                mBuilder.setVibrate(alarm.isVibrate() ? vibrationPattern : null);
            }

            //color
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                String color = alarm.getColor();
                if (color != null && !color.equals("")) {
                    mBuilder.setColor(Color.parseColor(color));
                }
            }

            mBuilder.setContentIntent(pendingIntent);

            if (alarm.isHasButton()) {
                Intent dismissIntent = new Intent(context, AlarmReceiver.class);
                dismissIntent.setAction(NOTIFICATION_ACTION_DISMISS);
                dismissIntent.putExtra("AlarmId", alarm.getId());
                PendingIntent pendingDismiss = PendingIntent.getBroadcast(context, notificationID, dismissIntent, defaultFlags | PendingIntent.FLAG_UPDATE_CURRENT);
                NotificationCompat.Action dismissAction = new NotificationCompat.Action(android.R.drawable.ic_lock_idle_alarm, "DISMISS", pendingDismiss);
                mBuilder.addAction(dismissAction);

                Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
                snoozeIntent.setAction(NOTIFICATION_ACTION_SNOOZE);
                snoozeIntent.putExtra("SnoozeAlarmId", alarm.getId());
                PendingIntent pendingSnooze = PendingIntent.getBroadcast(context, notificationID, snoozeIntent, defaultFlags | PendingIntent.FLAG_UPDATE_CURRENT);
                NotificationCompat.Action snoozeAction = new NotificationCompat.Action(R.drawable.ic_snooze, "SNOOZE", pendingSnooze);
                mBuilder.addAction(snoozeAction);
            }

            //use big text
            if (alarm.isUseBigText()) {
                mBuilder = mBuilder.setStyle(new NotificationCompat.BigTextStyle().bigText(message));
            }

            //large icon
            String largeIcon = alarm.getLargeIcon();
            if (largeIcon != null && !largeIcon.equals("") && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                int largeIconResId = res.getIdentifier(largeIcon, "mipmap", packageName);
                Bitmap largeIconBitmap = BitmapFactory.decodeResource(res, largeIconResId);
                if (largeIconResId != 0) {
                    mBuilder.setLargeIcon(largeIconBitmap);
                }
            }

            // set tag and push notification
            Notification notification = mBuilder.build();

            String tag = alarm.getTag();
            if (tag != null && !tag.equals("")) {
                mNotificationManager.notify(tag, notificationID, notification);
            } else {
                Log.i(Constants.TAG, "Notification done");
                mNotificationManager.notify(notificationID, notification);
            }
        } catch (Exception e) {
            Log.e(Constants.TAG, "Failed to send notification", e);
        }
    }

    void removeFiredNotification(int id) {
        try {
            AlarmModel alarm = alarmDB.getAlarm(id);
            getNotificationManager().cancel(alarm.getAlarmId());
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not remove fired notification with id " + id, e);
        }
    }

    void removeAllFiredNotifications() {
        getNotificationManager().cancelAll();
    }

    ArrayList<AlarmModel> getAlarms() {
        return alarmDB.getAlarmList(1);
    }

    WritableMap convertJsonToMap(JSONObject jsonObject) throws JSONException {
        WritableMap map = new WritableNativeMap();

        Iterator<String> iterator = jsonObject.keys();
        while (iterator.hasNext()) {
            String key = iterator.next();
            Object value = jsonObject.get(key);
            if (value instanceof JSONObject) {
                map.putMap(key, convertJsonToMap((JSONObject) value));
            } else if (value instanceof Boolean) {
                map.putBoolean(key, (Boolean) value);
            } else if (value instanceof Integer) {
                map.putInt(key, (Integer) value);
            } else if (value instanceof Double) {
                map.putDouble(key, (Double) value);
            } else if (value instanceof String) {
                map.putString(key, (String) value);
            } else {
                map.putString(key, value.toString());
            }
        }
        return map;
    }
}
