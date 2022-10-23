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
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
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

    public static class ShareModule extends ReactContextBaseJavaModule implements ActivityEventListener {

        ShareModule(@NonNull ReactApplicationContext reactContext) {
            super(reactContext);
            reactContext.addActivityEventListener(this);
        }

        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        }

        @Override
        public void onNewIntent(Intent intent) {
        }

        @NonNull
        @Override
        public String getName() {
            return "ShareExtension";
        }

        @ReactMethod
        public void close() {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity != null) {
                currentActivity.finish();
            }
        }

        @ReactMethod
        public void data(Promise promise) {
            promise.resolve(processIntent());
        }

        private WritableMap processIntent() {
            Activity currentActivity = getCurrentActivity();
            WritableMap map = Arguments.createMap();

            if (currentActivity == null) {
                return null;
            }

            Intent intent = currentActivity.getIntent();

            if (intent == null || !(Intent.ACTION_SEND.equals(intent.getAction())
                || Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))) {
                return null;
            }

            String type = intent.getType() == null ? "" : intent.getType();
            map.putString("type", type);
            map.putString("title", getTitle(intent));
            map.putString("text", intent.getStringExtra(Intent.EXTRA_TEXT));

            WritableArray resources = Arguments.createArray();

            if (Intent.ACTION_SEND.equals(intent.getAction())) {
                if (intent.hasExtra(Intent.EXTRA_STREAM)) {
                    resources.pushMap(getFileData(intent.getParcelableExtra(Intent.EXTRA_STREAM)));
                }
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
                ArrayList<Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (imageUris != null) {
                    for (Uri uri : imageUris) {
                        resources.pushMap(getFileData(uri));
                    }
                }
            }

            map.putArray("resources", resources);
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
    }
}
