package net.cozic.joplin.share;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.MimeTypeMap;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.uimanager.ViewManager;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SharePackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        return Collections.singletonList(new ShareModule(reactContext));
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    public static class ShareModule extends ReactContextBaseJavaModule implements ActivityEventListener, LifecycleEventListener {
        private boolean handledStartIntent = false;
        private Intent receivedShareIntent = null;

        ShareModule(@NonNull ReactApplicationContext reactContext) {
            super(reactContext);
            reactContext.addActivityEventListener(this);
            reactContext.addLifecycleEventListener(this);
        }

        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        }

        @Override
        public void onNewIntent(Intent intent) {
            if (intent == null || !(Intent.ACTION_SEND.equals(intent.getAction())
                    || Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))) {
                return;
            }
            receivedShareIntent = intent;
            this.getReactApplicationContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("new_share_intent", null);
        }

        @NonNull
        @Override
        public String getName() {
            return "ShareExtension";
        }

        @ReactMethod
        public void close() {
            // We disable this, because otherwise it would close the whole application
            // https://github.com/laurent22/joplin/issues/7791#issuecomment-1436078948

            // Activity currentActivity = getCurrentActivity();
            // if (currentActivity != null) {
            //     currentActivity.finish();
            // }
        }

        @ReactMethod
        public void data(Promise promise) {
            promise.resolve(processIntent());
        }

        private WritableMap processIntent() {
            WritableMap map = Arguments.createMap();

            if (receivedShareIntent == null) {
                return null;
            }

            if (receivedShareIntent.getBooleanExtra("is_processed", false)) {
                return null;
            }

            String type = receivedShareIntent.getType() == null ? "" : receivedShareIntent.getType();
            map.putString("type", type);
            map.putString("title", getTitle(receivedShareIntent));
            map.putString("text", receivedShareIntent.getStringExtra(Intent.EXTRA_TEXT));

            WritableArray resources = Arguments.createArray();

            if (Intent.ACTION_SEND.equals(receivedShareIntent.getAction())) {
                if (receivedShareIntent.hasExtra(Intent.EXTRA_STREAM)) {
                    resources.pushMap(getFileData(receivedShareIntent.getParcelableExtra(Intent.EXTRA_STREAM)));
                }
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(receivedShareIntent.getAction())) {
                ArrayList<Uri> imageUris = receivedShareIntent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (imageUris != null) {
                    for (Uri uri : imageUris) {
                        resources.pushMap(getFileData(uri));
                    }
                }
            }

            map.putArray("resources", resources);
            receivedShareIntent.putExtra("is_processed", true);
            return map;
        }

        private String getTitle(Intent intent) {
            if (intent.hasExtra(Intent.EXTRA_SUBJECT)) {
                return intent.getStringExtra(Intent.EXTRA_SUBJECT);
            } else if (intent.hasExtra(Intent.EXTRA_TITLE)) {
                return intent.getStringExtra(Intent.EXTRA_TITLE);
            } else {
                return null;
            }
        }

        private WritableMap getFileData(Uri uri) {
            Log.d("joplin", "getFileData: " + uri);

            WritableMap imageData = Arguments.createMap();

            ContentResolver contentResolver = getCurrentActivity().getContentResolver();
            String mimeType = contentResolver.getType(uri);
            String name = getFileName(uri, contentResolver);

            if (mimeType == null || mimeType.equals("image/*")) {
                String extension = getFileExtension(name);
                mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            }

            imageData.putString("uri", uri.toString());
            imageData.putString("name", name);
            imageData.putString("mimeType", mimeType);
            return imageData;
        }

        private String getFileName(Uri uri, ContentResolver contentResolver) {
            if (ContentResolver.SCHEME_FILE.equals(uri.getScheme())) {
                File file = new File(uri.getPath());
                return file.getName();
            } else if (ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
                String name = null;
                Cursor cursor = contentResolver.query(uri, null, null, null, null);
                if (cursor != null) {
                    try {
                        if (cursor.moveToFirst()) {
                            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                            name = cursor.getString(nameIndex);
                        }
                    } finally {
                        cursor.close();
                    }
                }
                return name;
            } else {
                Log.w("joplin", "Unknown URI scheme: " + uri.getScheme());
                return null;
            }
        }

        private String getFileExtension(String file) {
            if (file == null) {
                return null;
            }
            String ext = null;
            int i = file.lastIndexOf('.');
            if (i > 0) {
                ext = file.substring(i + 1);
            }
            return ext;
        }

        @ReactMethod
        public void addListener(String eventName) {
            // Set up any upstream listeners or background tasks as necessary
        }

        @ReactMethod
        public void removeListeners(Integer count) {
            // Remove upstream listeners, stop unnecessary background tasks
        }

        @Override
        public void onHostResume() {
            if (this.getCurrentActivity() != null) {
                Intent intent = this.getCurrentActivity().getIntent();
                if (this.handledStartIntent) {
                    // sometimes onHostResume is fired after onNewIntent
                    // and we only care about the activity intent when the first time app opens
                    return;
                }
                this.handledStartIntent = true;
                this.onNewIntent(intent);
            }
        }

        @Override
        public void onHostPause() {}

        @Override
        public void onHostDestroy() {
        }
    }
}
