package net.cozic.joplin.directorypicker;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

public class DirectoryPickerModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final int CODE = 54321;
    public static final String TAG = "JoplinDirPicker";

    private final ReactApplicationContext reactContext;
    private final AtomicReference<Promise> promise = new AtomicReference<>(null);

    public DirectoryPickerModule(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return "DirectoryPicker";
    }

    @ReactMethod
    public void isAvailable(Promise promise) {
        promise.resolve(android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP);
    }

    @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
    @ReactMethod
    public void pick(Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    .addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

            this.promise.set(promise);
            if (!reactContext.startActivityForResult(intent, CODE, null)) {
                promise.reject("1", "Failed to pick directory");
                this.promise.set(null);
            }
        } catch (Exception e) {
            promise.reject(e);
            this.promise.set(null);
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode != CODE) {
            return;
        }
        Promise promise = this.promise.getAndSet(null);
        if (resultCode != Activity.RESULT_OK) {
            promise.reject("2", "Cancelled");
            return;
        }
        WritableMap map = Arguments.createMap();

        Uri uri = data.getData();

        reactContext.getContentResolver().takePersistableUriPermission(uri,
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION & Intent.FLAG_GRANT_READ_URI_PERMISSION);

        map.putString("uri", uri.toString());
        map.putString("path", getFileName(uri));
        promise.resolve(map);
    }

    @Override
    public void onNewIntent(Intent intent) {
    }

    private String getFileName(Uri uri) {
        if (ContentResolver.SCHEME_FILE.equals(uri.getScheme())) {
            File file = new File(uri.getPath());
            return file.getName();
        } else if (ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
            String name = null;

            // URI examples
            // internal: content://com.android.externalstorage.documents/tree/primary%3Ajoplin
            // sd card:  content://com.android.externalstorage.documents/tree/1DEA-0313%3Ajoplin
            List<String> pathSegments = uri.getPathSegments();
            if (pathSegments.get(0).equalsIgnoreCase("tree")) {
                String[] parts = pathSegments.get(1).split(":", 2);
                if (parts[0].equalsIgnoreCase("primary")) {
                    name = new File(Environment.getExternalStorageDirectory(), parts[1]).getAbsolutePath();
                } else {
                    name = "/storage/" + parts[0] + "/" + parts[1];
                }
            }
            Log.i(TAG, "Resolved content URI " + uri + " to path " + name);
            return name;
        } else {
            Log.w(TAG, "Unknown URI scheme: " + uri.getScheme());
            return null;
        }
    }
}
