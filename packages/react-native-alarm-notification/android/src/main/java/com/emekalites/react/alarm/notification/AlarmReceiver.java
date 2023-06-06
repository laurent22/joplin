package com.emekalites.react.alarm.notification;

import android.app.Application;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;

public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null) {
            final AlarmDatabase alarmDB = new AlarmDatabase(context);
            AlarmUtil alarmUtil = new AlarmUtil((Application) context.getApplicationContext());

            try {
                String intentType = intent.getExtras().getString("intentType");
                if (Constants.ADD_INTENT.equals(intentType)) {
                    int id = intent.getExtras().getInt("PendingId");
                    try {
                        AlarmModel alarm = alarmDB.getAlarm(id);
                        alarmUtil.sendNotification(alarm);
                        alarmUtil.setBootReceiver();

                        ArrayList<AlarmModel> alarms = alarmDB.getAlarmList(1);
                        Log.d(Constants.TAG, "alarm start: " + alarm.toString() + ", alarms left: " + alarms.size());
                    } catch (Exception e) {
                        Log.e(Constants.TAG, "Failed to add alarm", e);
                    }
                }
            } catch (Exception e) {
                Log.e(Constants.TAG, "Received invalid intent", e);
            }

            String action = intent.getAction();
            if (action != null) {
                Log.i(Constants.TAG, "ACTION: " + action);
                switch (action) {
                    case Constants.NOTIFICATION_ACTION_SNOOZE:
                        int id = intent.getExtras().getInt("SnoozeAlarmId");

                        try {
                            AlarmModel alarm = alarmDB.getAlarm(id);
                            alarmUtil.snoozeAlarm(alarm);
                            Log.i(Constants.TAG, "alarm snoozed: " + alarm.toString());

                            alarmUtil.removeFiredNotification(alarm.getId());
                        } catch (Exception e) {
                            Log.e(Constants.TAG, "Failed to snooze alarm", e);
                        }
                        break;

                    case Constants.NOTIFICATION_ACTION_DISMISS:
                        id = intent.getExtras().getInt("AlarmId");

                        try {
                            AlarmModel alarm = alarmDB.getAlarm(id);
                            Log.i(Constants.TAG, "Cancel alarm: " + alarm.toString());

                            // emit notification dismissed
                            // TODO also send all user-provided args back
                            ANModule.getReactAppContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("OnNotificationDismissed", "{\"id\": \"" + alarm.getId() + "\"}");

                            alarmUtil.removeFiredNotification(alarm.getId());
                            alarmUtil.cancelAlarm(alarm, false); // TODO why false?
                        } catch (Exception e) {
                            Log.e(Constants.TAG, "Failed to dismiss alarm", e);
                        }
                        break;
                }
            }
        }
    }
}
