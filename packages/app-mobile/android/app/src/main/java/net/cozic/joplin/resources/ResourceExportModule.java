package net.cozic.joplin.resources;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.atomic.AtomicReference;

public class ResourceExportModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final int CODE = 54322;

    private final AtomicReference<ExportRequest> request = new AtomicReference<>(null);
    private final ReactApplicationContext reactContext;

    public ResourceExportModule(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return "ResourceExportModule";
    }

    @ReactMethod
    public void exportResource(String name, String mime, String path, Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.setType(mime);
            intent.putExtra(Intent.EXTRA_TITLE, name); // set default file name
            intent.addCategory(Intent.CATEGORY_OPENABLE);

            this.request.set(new ExportRequest(path, promise));

            if (!reactContext.startActivityForResult(intent, CODE, null)) {
                promise.reject("1", "Failed to export resource");
                this.request.set(null);
            }
        } catch (Exception e) {
            promise.reject(e);
            this.request.set(null);
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode != CODE) {
            return;
        }
        ExportRequest exportRequest = this.request.getAndSet(null);
        if (resultCode != Activity.RESULT_OK) {
            exportRequest.promise.reject("2", "Cancelled");
            return;
        }

        Uri target = data.getData();
        try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(new File(exportRequest.path)));
             OutputStream out = reactContext.getContentResolver().openOutputStream(target)) {
            byte[] buffer = new byte[4096];
            int len;
            while ((len = in.read(buffer)) > 0) {
                out.write(buffer, 0, len);
            }
        } catch (IOException e) {
            exportRequest.promise.resolve(e);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {

    }

    private static final class ExportRequest {
        private final String path;
        private final Promise promise;

        public ExportRequest(String path, Promise promise) {
            this.path = path;
            this.promise = promise;
        }
    }
}
