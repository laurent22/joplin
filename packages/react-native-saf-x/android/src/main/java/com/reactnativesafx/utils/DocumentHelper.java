package com.reactnativesafx.utils;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.net.Uri;
import android.os.Build;
import android.os.Build.VERSION_CODES;
import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.documentfile.provider.DocumentFile;
import androidx.documentfile.provider.DocumentFileHelper;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;

@RequiresApi(api = VERSION_CODES.Q)
public class DocumentHelper {

  private static final int DOCUMENT_TREE_REQUEST_CODE = 1;
  private static final int DOCUMENT_REQUEST_CODE = 2;
  private static final int DOCUMENT_CREATE_CODE = 3;

  private final ReactApplicationContext context;
  private ActivityEventListener activityEventListener;

  public DocumentHelper(ReactApplicationContext context) {
    this.context = context;
  }

  public void openDocumentTree(final boolean persist, final Promise promise) {
    try {

      Intent intent = new Intent();
      intent.setAction(Intent.ACTION_OPEN_DOCUMENT_TREE);

      if (activityEventListener != null) {
        context.removeActivityEventListener(activityEventListener);
        activityEventListener = null;
      }

      activityEventListener =
          new ActivityEventListener() {
            @SuppressLint("WrongConstant")
            @Override
            public void onActivityResult(
                Activity activity, int requestCode, int resultCode, Intent intent) {
              if (requestCode == DOCUMENT_TREE_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
                if (intent != null) {
                  Uri uri = intent.getData();
                  if (persist) {
                    final int takeFlags =
                        intent.getFlags()
                            & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

                    context.getContentResolver().takePersistableUriPermission(uri, takeFlags);
                  }

                  try {
                    DocumentFile doc = goToDocument(uri.toString(), false);
                    resolveWithDocument(doc, promise, uri.toString());
                  } catch (Exception e) {
                    promise.resolve(null);
                  }
                } else {
                  promise.resolve(null);
                }
              } else {
                promise.resolve(null);
              }
              context.removeActivityEventListener(activityEventListener);
              activityEventListener = null;
            }

            @Override
            public void onNewIntent(Intent intent) {}
          };

      context.addActivityEventListener(activityEventListener);

      Activity activity = context.getCurrentActivity();
      if (activity != null) {
        activity.startActivityForResult(intent, DOCUMENT_TREE_REQUEST_CODE);
      } else {
        promise.reject("ERROR", "Cannot get current activity, so cannot launch document picker");
      }

    } catch (Exception e) {
      promise.reject("ERROR", e.getMessage());
    }
  }

  public void openDocument(final boolean persist, final Promise promise) {
    try {

      Intent intent = new Intent();
      intent.setAction(Intent.ACTION_OPEN_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.setType("*/*");

      if (activityEventListener != null) {
        context.removeActivityEventListener(activityEventListener);
        activityEventListener = null;
      }

      activityEventListener =
          new ActivityEventListener() {
            @SuppressLint("WrongConstant")
            @Override
            public void onActivityResult(
                Activity activity, int requestCode, int resultCode, Intent intent) {
              if (requestCode == DOCUMENT_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
                if (intent != null) {
                  Uri uri = intent.getData();
                  if (persist) {
                    final int takeFlags =
                        intent.getFlags()
                            & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

                    context.getContentResolver().takePersistableUriPermission(uri, takeFlags);
                  }

                  try {
                    DocumentFile doc = goToDocument(uri.toString(), false);
                    resolveWithDocument(doc, promise, uri.toString());
                  } catch (Exception e) {
                    promise.resolve(null);
                  }
                } else {
                  promise.resolve(null);
                }
              } else {
                promise.resolve(null);
              }
              context.removeActivityEventListener(activityEventListener);
              activityEventListener = null;
            }

            @Override
            public void onNewIntent(Intent intent) {}
          };

      context.addActivityEventListener(activityEventListener);

      Activity activity = context.getCurrentActivity();
      if (activity != null) {
        activity.startActivityForResult(intent, DOCUMENT_REQUEST_CODE);
      } else {
        promise.reject("ERROR", "Cannot get current activity, so cannot launch document picker");
      }

    } catch (Exception e) {
      promise.reject("ERROR", e.getMessage());
    }
  }

  public void createDocument(
      final String data,
      final String encoding,
      final String initialName,
      final String mimeType,
      final Promise promise) {
    try {

      Intent intent = new Intent();
      intent.setAction(Intent.ACTION_CREATE_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      if (initialName != null) {
        intent.putExtra(Intent.EXTRA_TITLE, initialName);
      }
      if (mimeType != null) {
        intent.setType(mimeType);
      } else {
        intent.setType("*/*");
      }

      if (activityEventListener != null) {
        context.removeActivityEventListener(activityEventListener);
        activityEventListener = null;
      }

      activityEventListener =
          new ActivityEventListener() {
            @Override
            public void onActivityResult(
                Activity activity, int requestCode, int resultCode, Intent intent) {

              if (requestCode == DOCUMENT_CREATE_CODE && resultCode == Activity.RESULT_OK) {
                if (intent != null) {
                  Uri uri = intent.getData();

                  DocumentFile doc = DocumentFile.fromSingleUri(context, uri);

                  try {
                    byte[] bytes = GeneralHelper.stringToBytes(data, encoding);
                    try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                      os.write(bytes);
                    }
                    assert doc != null;
                    resolveWithDocument(doc, promise, uri.toString());
                  } catch (Exception e) {
                    promise.reject("ERROR", e.getLocalizedMessage());
                  }
                } else {
                  promise.resolve(null);
                }
              } else {
                promise.resolve(null);
              }

              context.removeActivityEventListener(activityEventListener);
              activityEventListener = null;
            }

            @Override
            public void onNewIntent(Intent intent) {}
          };

      context.addActivityEventListener(activityEventListener);

      Activity activity = context.getCurrentActivity();
      if (activity != null) {
        activity.startActivityForResult(intent, DOCUMENT_CREATE_CODE);
      } else {
        promise.reject("ERROR", "Cannot get current activity, so cannot launch document picker");
      }
    } catch (Exception e) {
      promise.reject("ERROR", e.getMessage());
    }
  }

  @RequiresApi(api = Build.VERSION_CODES.Q)
  @SuppressWarnings({"UnusedDeclaration", "UnusedAssignment"})
  public Object readFromUri(Uri uri, String encoding) throws IOException {
    byte[] bytes;
    int bytesRead;
    int length;

    InputStream inputStream = context.getContentResolver().openInputStream(uri);

    length = inputStream.available();
    bytes = new byte[length];
    bytesRead = inputStream.read(bytes);
    inputStream.close();

    switch (encoding.toLowerCase()) {
      case "base64":
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
      case "ascii":
        WritableArray asciiResult = Arguments.createArray();
        for (byte b : bytes) {
          asciiResult.pushInt(b);
        }
        return asciiResult;
      case "utf8":
      default:
        return new String(bytes);
    }
  }

  public boolean exists(final String uriString) {
    return this.exists(uriString, false);
  }

  public boolean exists(final String uriString, final boolean shouldBeFile) {
    try {
      DocumentFile fileOrFolder = goToDocument(uriString, false);
      if (shouldBeFile) {
        return !fileOrFolder.isDirectory();
      }
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public boolean hasPermission(String uriString) {
    // list of all persisted permissions for our app
    List<UriPermission> uriList = context.getContentResolver().getPersistedUriPermissions();
    for (UriPermission uriPermission : uriList) {
      if (permissionMatchesAndHasAccess(uriPermission, UriHelper.normalize(uriString))) {
        return true;
      }
    }
    return false;
  }

  public boolean permissionMatchesAndHasAccess(
      UriPermission permission, String normalizedUriString) {
    String permittedUri = permission.getUri().toString();
    return (permittedUri.startsWith(normalizedUriString)
            || normalizedUriString.startsWith(permittedUri))
        && permission.isReadPermission()
        && permission.isWritePermission();
  }

  private String getPermissionErrorMsg(final String uriString) {
    return "You don't have read/write permission to access uri: " + uriString;
  }

  public static WritableMap resolveWithDocument(
      @NonNull DocumentFile file, Promise promise, String SimplifiedUri) {
    WritableMap fileMap = Arguments.createMap();
    fileMap.putString("uri", UriHelper.denormalize(SimplifiedUri));
    fileMap.putString("name", file.getName());
    fileMap.putString("type", file.isDirectory() ? "directory" : "file");
    if (file.isFile()) {
      fileMap.putString("mime", file.getType());
      fileMap.putDouble("size", file.length());
    }
    fileMap.putDouble("lastModified", file.lastModified());

    if (promise != null) {
      promise.resolve(fileMap);
    }
    return fileMap;
  }

  public DocumentFile mkdir(String uriString)
      throws IOException, SecurityException, IllegalArgumentException {
    return this.mkdir(uriString, true);
  }

  /**
   * @return a DocumentFile that is created using DocumentFile.fromTreeUri()
   */
  public DocumentFile mkdir(String uriString, boolean includeLastSegment)
      throws IOException, SecurityException, IllegalArgumentException {
    DocumentFile dir = goToDocument(uriString, true, includeLastSegment);
    assert dir != null;
    return dir;
  }

  public DocumentFile createFile(String uriString) throws IOException, SecurityException {
    return createFile(uriString, null);
  }

  public DocumentFile createFile(String uriString, String mimeType)
      throws IOException, SecurityException {
    if (this.exists(uriString)) {
      throw new IOException("a file or directory already exist at: " + uriString);
    }
    DocumentFile parentDirOfFile = this.mkdir(uriString, false);
    // it should be safe because user cannot select sd root or primary root
    // and any other path would have at least one '/' to provide a file name in a folder
    String fileName = UriHelper.getLastSegment(uriString);
    if (fileName.indexOf(':') != -1) {
      throw new IOException(
          "Invalid file name: Could not extract filename from uri string provided");
    }
    DocumentFile createdFile =
        parentDirOfFile.createFile(
            mimeType != null && !mimeType.equals("") ? mimeType : "*/*", fileName);
    if (createdFile == null) {
      throw new IOException(
          "File creation failed without any specific error for '" + fileName + "'");
    }
    return createdFile;
  }

  public DocumentFile goToDocument(String uriString, boolean createIfDirectoryNotExist)
      throws SecurityException, IOException {
    return goToDocument(uriString, createIfDirectoryNotExist, true);
  }

  public DocumentFile goToDocument(
      String unknownUriStr, boolean createIfDirectoryNotExist, boolean includeLastSegment)
      throws SecurityException, IOException, IllegalArgumentException {
      String unknownUriString = UriHelper.getUnifiedUri(unknownUriStr);
    if (unknownUriString.startsWith(ContentResolver.SCHEME_FILE)) {
      Uri uri = Uri.parse(unknownUriString);
      if (uri == null) {
        throw new IllegalArgumentException("Invalid Uri String");
      }
      String path =
        uri.getPath()
          .substring(
            0,
            includeLastSegment
              ? uri.getPath().length()
              : uri.getPath().length() - uri.getLastPathSegment().length());

      if (createIfDirectoryNotExist) {
        File targetFile = new File(path);
        if (!targetFile.exists()) {
          boolean madeFolder = targetFile.mkdirs();
          if (!madeFolder) {
            throw new IOException("mkdir failed for Uri with `file` scheme");
          }
        }
      }
      DocumentFile targetFile = DocumentFile.fromFile(new File(path));
      if (!targetFile.exists()) {
        throw new FileNotFoundException(
          "Cannot find the given document. File does not exist at '" + unknownUriString + "'");
      }
      return targetFile;
    }
    String uriString = UriHelper.normalize(unknownUriString);
    String baseUri = "";
    String appendUri;
    String[] strings = new String[0];

    List<UriPermission> uriList = context.getContentResolver().getPersistedUriPermissions();

    for (UriPermission uriPermission : uriList) {
      String uriPath = uriPermission.getUri().toString();
      if (this.permissionMatchesAndHasAccess(uriPermission, uriString)) {
        baseUri = uriPath;
        appendUri = Uri.decode(uriString.substring(uriPath.length()));
        strings = appendUri.split("/");
        break;
      }
    }

    if (baseUri.equals("")) {
      throw new SecurityException(getPermissionErrorMsg(uriString));
    }

    if (baseUri.matches("^content://[\\w.]+/document/.*")) {
      // It's a document picked by user
      DocumentFile doc = DocumentFile.fromSingleUri(context, Uri.parse(uriString));
      if (doc != null && doc.isFile() && doc.exists()) {
        return doc;
      } else {
        throw new FileNotFoundException(
            "Cannot find the given document. File does not exist at '" + uriString + "'");
      }
    }

    Uri uri = Uri.parse(baseUri);
    DocumentFile dir = DocumentFile.fromTreeUri(context, uri);

    int pathSegmentsToTraverseLength = includeLastSegment ? strings.length : strings.length - 1;
    for (int i = 0; i < pathSegmentsToTraverseLength; i++) {
      if (!strings[i].equals("")) {
        assert dir != null;
        DocumentFile childDoc = DocumentFileHelper.findFile(context, dir, strings[i]);
        if (childDoc != null) {
          if (childDoc.isDirectory()) {
            dir = childDoc;
          } else if (i == pathSegmentsToTraverseLength - 1) {
            // we are at the last part to traverse, its our destination, doesn't matter if its a
            // file or directory
            dir = childDoc;
          } else {
            // child doc is a file
            throw new IOException(
                "There's a document with the same name as the one we are trying to traverse at: '"
                    + childDoc.getUri()
                    + "'");
          }
        } else {
          if (createIfDirectoryNotExist) {
            dir = dir.createDirectory(strings[i]);
          } else {
            throw new FileNotFoundException(
                "Cannot traverse to the pointed document. Directory '"
                    + strings[i]
                    + "'"
                    + " does not exist in '"
                    + dir.getUri()
                    + "'");
          }
        }
      }
    }
    assert dir != null;
    return dir;
  }

  public void transferFile(
      String srcUri, String destUri, boolean replaceIfDestExists, boolean copy, Promise promise) {
    try {
      DocumentFile srcDoc = this.goToDocument(srcUri, false, true);

      if (srcDoc.isDirectory()) {
        throw new IllegalArgumentException("Cannot move directories");
      }

      DocumentFile destDoc;
      try {
        destDoc = this.goToDocument(destUri, false, true);
        if (!replaceIfDestExists) {
          throw new IOException("a document with the same name already exists in destination");
        }
      } catch (FileNotFoundException e) {
        destDoc = this.createFile(destUri, srcDoc.getType());
      }

      try (InputStream inStream =
              this.context.getContentResolver().openInputStream(srcDoc.getUri());
          OutputStream outStream =
              this.context.getContentResolver().openOutputStream(destDoc.getUri(), "wt"); ) {
        byte[] buffer = new byte[1024 * 4];
        int length;
        while ((length = inStream.read(buffer)) > 0) {
          outStream.write(buffer, 0, length);
        }
      }

      if (!copy) {
        srcDoc.delete();
      }

      promise.resolve(resolveWithDocument(destDoc, promise, destUri));
    } catch (Exception e) {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }
}
