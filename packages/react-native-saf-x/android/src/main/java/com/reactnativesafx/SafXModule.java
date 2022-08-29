package com.reactnativesafx;

import android.content.Intent;
import android.net.Uri;
import android.os.Build.VERSION_CODES;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.documentfile.provider.DocumentFile;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.reactnativesafx.utils.DocumentHelper;
import com.reactnativesafx.utils.GeneralHelper;
import com.reactnativesafx.utils.UriHelper;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Arrays;

@RequiresApi(api = VERSION_CODES.Q)
@ReactModule(name = SafXModule.NAME)
public class SafXModule extends ReactContextBaseJavaModule {
  public static final String NAME = "SafX";
  private final DocumentHelper documentHelper;

  public SafXModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.documentHelper = new DocumentHelper(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void openDocumentTree(final boolean persist, final Promise promise) {
    this.documentHelper.openDocumentTree(persist, promise);
  }

  @ReactMethod
  public void openDocument(final boolean persist, final Promise promise) {
    this.documentHelper.openDocument(persist, promise);
  }

  @ReactMethod
  public void createDocument(
      final String data,
      final String encoding,
      final String initialName,
      final String mimeType,
      final Promise promise) {
    this.documentHelper.createDocument(data, encoding, initialName, mimeType, promise);
  }

  @ReactMethod
  public void hasPermission(String uriString, final Promise promise) {
    if (this.documentHelper.hasPermission(uriString)) {
      promise.resolve(true);
    } else {
      promise.resolve(false);
    }
  }

  @ReactMethod
  public void exists(String uriString, final Promise promise) {
    try {
      promise.resolve(this.documentHelper.exists(uriString));
    } catch (Exception e) {
      promise.reject("ERROR", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void readFile(String uriString, String encoding, final Promise promise) {
    try {
      DocumentFile file;

      try {
        file = this.documentHelper.goToDocument(uriString, false, true);
      } catch (FileNotFoundException e) {
        promise.reject("ENOENT", "'" + uriString + "' does not exist");
        return;
      }
      if (encoding != null) {
        if (encoding.equals("ascii")) {
          WritableArray arr =
              (WritableArray) this.documentHelper.readFromUri(file.getUri(), encoding);
          promise.resolve((arr));
        } else {
          promise.resolve(this.documentHelper.readFromUri(file.getUri(), encoding));
        }
      } else {
        promise.resolve(this.documentHelper.readFromUri(file.getUri(), "utf8"));
      }
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void writeFile(
      String uriString,
      String data,
      String encoding,
      String mimeType,
      boolean append,
      final Promise promise) {
    try {
      DocumentFile file;

      try {
        file = this.documentHelper.goToDocument(uriString, false, true);
      } catch (FileNotFoundException e) {
        file = this.documentHelper.createFile(uriString, mimeType);
      }

      byte[] bytes = GeneralHelper.stringToBytes(data, encoding);

      try (OutputStream fout =
          this.getReactApplicationContext()
              .getContentResolver()
              .openOutputStream(file.getUri(), append ? "wa" : "wt")) {
        fout.write(bytes);
      }

      promise.resolve(uriString);
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void transferFile(
      String srcUri, String destUri, boolean replaceIfDestExists, boolean copy, Promise promise) {
    this.documentHelper.transferFile(srcUri, destUri, replaceIfDestExists, copy, promise);
  }

  @ReactMethod
  public void rename(String uriString, String newName, final Promise promise) {
    try {

      DocumentFile doc;
      try {
        doc = this.documentHelper.goToDocument(uriString, false, true);
      } catch (FileNotFoundException e) {
        promise.reject("ENOENT", "'" + uriString + "' does not exist");
        return;
      }

      if (doc.renameTo(newName)) {
        promise.resolve(true);
      } else {
        promise.resolve(false);
      }
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void unlink(String uriString, final Promise promise) {
    try {
      DocumentFile doc = this.documentHelper.goToDocument(uriString, false, true);
      boolean result = doc.delete();
      if (!result) {
        throw new Exception("Failed to unlink file. Unknown error.");
      }
      promise.resolve(true);
    } catch (FileNotFoundException e) {
      promise.reject("ENOENT", e.getLocalizedMessage());
    } catch (SecurityException e) {
      promise.reject("EPERM", e.getLocalizedMessage());
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void mkdir(String uriString, final Promise promise) {
    try {
      DocumentFile dir = this.documentHelper.mkdir(uriString);
      DocumentHelper.resolveWithDocument(dir, promise, uriString);
    } catch (IOException e) {
      promise.reject("EEXIST", e.getLocalizedMessage());
    } catch (SecurityException e) {
      promise.reject("EPERM", e.getLocalizedMessage());
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void createFile(String uriString, String mimeType, final Promise promise) {
    try {
      DocumentFile createdFile = this.documentHelper.createFile(uriString, mimeType);
      DocumentHelper.resolveWithDocument(createdFile, promise, uriString);
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
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
    try {
      DocumentFile doc = this.documentHelper.goToDocument(uriString, false, true);

      WritableMap[] resolvedDocs =
          Arrays.stream(doc.listFiles())
              .map(
                  docEntry ->
                      DocumentHelper.resolveWithDocument(
                          docEntry, null, uriString + "/" + docEntry.getName()))
              .toArray(WritableMap[]::new);
      WritableArray resolveData = Arguments.fromJavaArgs(resolvedDocs);
      promise.resolve(resolveData);
    } catch (FileNotFoundException e) {
      promise.reject("ENOENT", e.getLocalizedMessage());
    } catch (SecurityException e) {
      promise.reject("EPERM", e.getLocalizedMessage());
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  @ReactMethod
  public void stat(String uriString, final Promise promise) {
    try {
      DocumentFile doc = this.documentHelper.goToDocument(uriString, false, true);

      DocumentHelper.resolveWithDocument(doc, promise, uriString);
    } catch (FileNotFoundException e) {
      promise.reject("ENOENT", e.getLocalizedMessage());
    } catch (SecurityException e) {
      promise.reject("EPERM", e.getLocalizedMessage());
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }
}
