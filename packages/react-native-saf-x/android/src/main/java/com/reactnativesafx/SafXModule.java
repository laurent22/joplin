package com.reactnativesafx;

import android.content.Intent;
import android.net.Uri;
import android.os.Build.VERSION_CODES;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.module.annotations.ReactModule;
import com.reactnativesafx.utils.EfficientDocumentHelper;
import com.reactnativesafx.utils.UriHelper;

@RequiresApi(api = VERSION_CODES.Q)
@ReactModule(name = SafXModule.NAME)
public class SafXModule extends ReactContextBaseJavaModule {
  public static final String NAME = "SafX";
  private final EfficientDocumentHelper efficientDocumentHelper;

  public SafXModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.efficientDocumentHelper = new EfficientDocumentHelper(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void openDocumentTree(final boolean persist, final Promise promise) {
    this.efficientDocumentHelper.openDocumentTree(persist, promise);
  }

  @ReactMethod
  public void openDocument(final boolean persist, final boolean multiple, final Promise promise) {
    this.efficientDocumentHelper.openDocument(persist, multiple, promise);
  }

  @ReactMethod
  public void createDocument(
    final String data,
    final String encoding,
    final String initialName,
    final String mimeType,
    final Promise promise) {
    this.efficientDocumentHelper.createDocument(data, encoding, initialName, mimeType, promise);
  }

  @ReactMethod
  public void hasPermission(String uriString, final Promise promise) {
    this.efficientDocumentHelper.hasPermission(uriString, promise);
  }

  @ReactMethod
  public void exists(String uriString, final Promise promise) {
    this.efficientDocumentHelper.exists(uriString, promise);
  }

  @ReactMethod
  public void readFile(String uriString, String encoding, final Promise promise) {
    this.efficientDocumentHelper.readFile(uriString, encoding, promise);
  }

  @ReactMethod
  public void writeFile(
    String uriString,
    String data,
    String encoding,
    String mimeType,
    boolean append,
    final Promise promise) {
    this.efficientDocumentHelper.writeFile(
      uriString, data, encoding, mimeType, append, promise
    );
  }

  @ReactMethod
  public void transferFile(
    String srcUri, String destUri, boolean replaceIfDestExists, boolean copy, Promise promise) {
    this.efficientDocumentHelper.transferFile(srcUri, destUri, replaceIfDestExists, copy, promise);
  }

  @ReactMethod
  public void rename(String uriString, String newName, final Promise promise) {
    this.efficientDocumentHelper.renameTo(uriString, newName, promise);
  }

  @ReactMethod
  public void unlink(String uriString, final Promise promise) {
    this.efficientDocumentHelper.unlink(uriString, promise);
  }

  @ReactMethod
  public void mkdir(String uriString, final Promise promise) {
    this.efficientDocumentHelper.mkdir(uriString, promise);
  }

  @ReactMethod
  public void createFile(String uriString, String mimeType, final Promise promise) {
    this.efficientDocumentHelper.createFile(uriString, mimeType, promise);
  }

  @ReactMethod
  public void getPersistedUriPermissions(final Promise promise) {
    String[] uriList =
      getReactApplicationContext().getContentResolver().getPersistedUriPermissions().stream()
        .map(uriPermission -> uriPermission.getUri().toString())
        .toArray(String[]::new);

    WritableArray wa = Arguments.fromArray(uriList);
    promise.resolve(wa);
  }

  @ReactMethod
  public void releasePersistableUriPermission(String uriString, final Promise promise) {
    Uri uriToRevoke = Uri.parse(UriHelper.normalize(uriString));
    final int takeFlags =
      (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
    this.getReactApplicationContext()
      .getContentResolver()
      .releasePersistableUriPermission(uriToRevoke, takeFlags);
    promise.resolve(null);
  }

  @ReactMethod
  public void listFiles(String uriString, final Promise promise) {
    efficientDocumentHelper.listFiles(uriString, promise);
  }

  @ReactMethod
  public void stat(String uriString, final Promise promise) {
    efficientDocumentHelper.stat(uriString, promise);
  }
}
