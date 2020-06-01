package net.cozic.joplin.widgets;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONException;
import org.json.JSONObject;

public abstract class WidgetData {
    private static final String NAME = "widget_data";
    private SharedPreferences sharedPreferences;

    protected Context context;

    protected abstract String getKey();

    protected WidgetData(Context context) {
        this.context = context;
        sharedPreferences = context.getSharedPreferences(NAME, Context.MODE_PRIVATE);
    }

    protected JSONObject readJSON() {
        try {
            return new JSONObject(readString());
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    protected void writeJSON(JSONObject value) {
        writeString(value.toString());
    }

    protected String readString() {
        return sharedPreferences.getString(getKey(), "{}");
    }

    protected void writeString(String value) {
        sharedPreferences.edit().putString(getKey(), value).apply();
    }

    public ReactModule createReactModule(String name) {
        return new ReactModule((ReactApplicationContext) context, name, this);
    }

    private final static class ReactModule extends ReactContextBaseJavaModule {
        private String name;
        private WidgetData widgetData;

        private ReactModule(@NonNull ReactApplicationContext reactContext, String name, WidgetData widgetData) {
            super(reactContext);
            this.name = name;
            this.widgetData = widgetData;
        }

        @NonNull
        @Override
        public String getName() {
            return name;
        }

        @ReactMethod
        public void write(String value) {
            widgetData.writeString(value);
        }

        @ReactMethod
        public void read(Promise promise) {
            promise.resolve(widgetData.readString());
        }

    }
}
