package net.cozic.joplin.debug;

import android.content.pm.PackageInfo;
import android.os.Build;
import android.webkit.WebView;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.bridge.ReactMethod;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DebugPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        return Collections.singletonList(new DebugModule(reactContext));
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    public static class DebugModule extends ReactContextBaseJavaModule {
        public DebugModule(@NonNull ReactApplicationContext context) {
            super(context);
        }

        @Override
		public Map<String, Object> getConstants() {
            final Map<String, Object> result = new HashMap<String, Object>();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PackageInfo webViewPackage = WebView.getCurrentWebViewPackage();

                if (webViewPackage != null) {
                    result.put("webViewVersion", webViewPackage.versionName);
                }
            }
            return result;
        }

        @NonNull
        @Override
        public String getName() {
            return "DebugModule";
        }
    }
}