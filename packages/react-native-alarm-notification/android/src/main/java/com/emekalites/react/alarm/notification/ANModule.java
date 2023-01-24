package com.emekalites.react.alarm.notification;

import android.app.Activity;
import android.app.Application;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

@SuppressWarnings("unused")
public class ANModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final String E_SCHEDULE_ALARM_FAILED = "E_SCHEDULE_ALARM_FAILED";

    private static ReactApplicationContext mReactContext;

    private final AlarmUtil alarmUtil;
    private final AlarmModelCodec codec = new AlarmModelCodec();

    ANModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
        alarmUtil = new AlarmUtil((Application) reactContext.getApplicationContext());
        reactContext.addActivityEventListener(this);
    }

    static ReactApplicationContext getReactAppContext() {
        return mReactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "RNAlarmNotification";
    }
    
    // Required for rn built in EventEmitter Calls.
    @ReactMethod
    public void addListener(String eventName) {

    }

    @ReactMethod
    public void removeListeners(Integer count) {

    }

    private AlarmDatabase getAlarmDB() {
        return new AlarmDatabase(mReactContext);
    }

    @ReactMethod
    public void scheduleAlarm(ReadableMap details, Promise promise) {
        try {
            Bundle bundle = Arguments.toBundle(details);
            AlarmModel alarm = AlarmModel.fromBundle(bundle);

            // check if alarm has been set at this time
            boolean containAlarm = alarmUtil.checkAlarm(getAlarmDB().getAlarmList(1), alarm);
            if (!containAlarm) {
                int id = getAlarmDB().insert(alarm);
                alarm.setId(id);

                alarmUtil.setAlarm(alarm);

                WritableMap map = Arguments.createMap();
                map.putInt("id", id);

                promise.resolve(map);
            } else {
                promise.reject(E_SCHEDULE_ALARM_FAILED, "duplicate alarm set at date");
            }
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not schedule alarm", e);
            promise.reject(E_SCHEDULE_ALARM_FAILED, e);
        }
    }

    @ReactMethod
    public void deleteAlarm(int alarmID) {
        alarmUtil.deleteAlarm(alarmID);
    }

    @ReactMethod
    public void deleteRepeatingAlarm(int alarmID) {
        alarmUtil.deleteRepeatingAlarm(alarmID);
    }

    @ReactMethod
    public void sendNotification(ReadableMap details) {
        try {
            Bundle bundle = Arguments.toBundle(details);
            AlarmModel alarm = AlarmModel.fromBundle(bundle);

            int id = getAlarmDB().insert(alarm);
            alarm.setId(id);

            alarmUtil.sendNotification(alarm);
        } catch (Exception e) {
            Log.e(Constants.TAG, "Could not send notification", e);
        }
    }

    @ReactMethod
    public void removeFiredNotification(int id) {
        alarmUtil.removeFiredNotification(id);
    }

    @ReactMethod
    public void removeAllFiredNotifications() {
        alarmUtil.removeAllFiredNotifications();
    }

    @ReactMethod
    public void getScheduledAlarms(Promise promise) throws JSONException {
        ArrayList<AlarmModel> alarms = alarmUtil.getAlarms();
        WritableArray array = Arguments.createArray();
        for (AlarmModel alarm : alarms) {
            // TODO triple conversion alarm -> string -> json -> map
            // this is ugly but I don't have time to fix it now
            WritableMap alarmMap = alarmUtil.convertJsonToMap(new JSONObject(codec.toJson(alarm)));
            array.pushMap(alarmMap);
        }
        promise.resolve(array);
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {

    }

    @Override
    public void onNewIntent(Intent intent) {
        if (Constants.NOTIFICATION_ACTION_CLICK.equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            try {
                if (bundle != null) {
                    int alarmId = bundle.getInt(Constants.NOTIFICATION_ID);
                    alarmUtil.removeFiredNotification(alarmId);
                    alarmUtil.doCancelAlarm(alarmId);

                    WritableMap response = Arguments.fromBundle(bundle.getBundle("data"));
                    mReactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("OnNotificationOpened", response);
                }
            } catch (Exception e) {
                Log.e(Constants.TAG, "Couldn't convert bundle to JSON", e);
            }
        }
    }

    @ReactMethod
    public void getAlarmInfo(Promise promise) {
        if (getCurrentActivity() == null) {
            promise.resolve(null);
            return;
        }

        Intent intent = getCurrentActivity().getIntent();
        if (intent != null) {
            if (Constants.NOTIFICATION_ACTION_CLICK.equals(intent.getAction()) &&
                    intent.getExtras() != null) {
                Bundle bundle = intent.getExtras();
                WritableMap response = Arguments.fromBundle(bundle.getBundle("data"));
                promise.resolve(response);

                // cleanup

                // other libs may not expect the intent to be null so set an empty intent here
                getCurrentActivity().setIntent(new Intent());

                int alarmId = bundle.getInt(Constants.NOTIFICATION_ID);
                alarmUtil.removeFiredNotification(alarmId);
                alarmUtil.doCancelAlarm(alarmId);

                return;
            }
        }
        promise.resolve(null);
    }
}
