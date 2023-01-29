package com.reactnativesafx.utils;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.reactnativesafx.utils.exceptions.ExceptionFast;
import com.reactnativesafx.utils.exceptions.FileNotFoundExceptionFast;
import com.reactnativesafx.utils.exceptions.IOExceptionFast;
import com.reactnativesafx.utils.exceptions.RenameFailedException;
import com.reactnativesafx.utils.exceptions.SecurityExceptionFast;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;

@RequiresApi(api = Build.VERSION_CODES.N)
public class EfficientDocumentHelper {
  private static final int DOCUMENT_TREE_REQUEST_CODE = 1;
  private static final int DOCUMENT_REQUEST_CODE = 2;
  private static final int DOCUMENT_CREATE_CODE = 3;
  private final ReactApplicationContext context;
  private ActivityEventListener activityEventListener;

  public EfficientDocumentHelper(ReactApplicationContext context) {
    this.context = context;
  }

  private void rejectWithException(final Exception e, final Promise promise) {
    if (e instanceof FileNotFoundException) {
      promise.reject("ENOENT", e.getLocalizedMessage());
    } else if (e instanceof SecurityException) {
      promise.reject("EPERM", e.getLocalizedMessage());
    } else if (e instanceof IOException && e.getMessage() != null && e.getMessage().contains("already exist")) {
      promise.reject("EEXIST", e.getLocalizedMessage());
    } else {
      promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
    }
  }

  private boolean permissionMatchesAndHasAccess(
    UriPermission permission, String normalizedUriString) {
    String permittedUri = permission.getUri().toString();
    return (normalizedUriString.startsWith(permittedUri))
      && permission.isReadPermission()
      && permission.isWritePermission();
  }

  private Uri getDocumentUri(String unknownUriStr, boolean createIfDirectoryNotExist, boolean includeLastSegment) throws IOException {
    Uri uri = UriHelper.getUnifiedUri(unknownUriStr);
    Uri baseUri = uri;

    if (uri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
      String path =
        uri.getPath()
          .substring(
            0,
            includeLastSegment
              ? uri.getPath().length()
              : uri.getPath().length() - uri.getLastPathSegment().length());

      File targetFile = new File(path);
      if (createIfDirectoryNotExist) {
        if (!targetFile.exists()) {
          boolean madeFolder = targetFile.mkdirs();
          if (!madeFolder) {
            throw new IOExceptionFast("mkdir failed for Uri with `file` scheme");
          }
        }
      }

      if (!targetFile.exists()) {
        throw new FileNotFoundExceptionFast("file does not exist at: " + unknownUriStr);
      }

      uri = Uri.fromFile(targetFile);
      return uri;
    } else if (UriHelper.isDocumentUri(uri)) {
      // It's a document picked by user, nothing much we can do. operations limited.
      DocumentStat stat = null;

      try {
        stat = getStat(uri);
      } catch (Exception ignored) {
        if (createIfDirectoryNotExist) {
          throw new IOExceptionFast("Unsupported uri: " + unknownUriStr);
        }
      }

      if (stat == null) {
        throw new FileNotFoundExceptionFast("file does not exist at: " + unknownUriStr);
      }

      return uri;
    } else {
      // It's a document tree based uri, can have library user's appended path, or not
      String uriString = UriHelper.normalize(unknownUriStr);
      baseUri = null;
      String appendUri;
      String[] strings = new String[0];

      {
        // Helps traversal and folder creation by knowing where to start traverse
        List<UriPermission> uriList = context.getContentResolver().getPersistedUriPermissions();
        for (UriPermission uriPermission : uriList) {
          String uriPath = uriPermission.getUri().toString();
            if (permissionMatchesAndHasAccess(uriPermission, uriString)) {
            baseUri = uriPermission.getUri();
            appendUri = Uri.decode(uriString.substring(uriPath.length()));
            // sometimes appendUri can be empty string
            // which then causes strings to be [""]
            // this is perfectly fine, which means we don't check baseUri's existence
            // as it can be troublesome
            strings = appendUri.split("/");
            break;
          }
        }
      }

      if (baseUri == null) {
        // It's possible that the file access is temporary
        baseUri = uri;
      }

      uri = baseUri;

      int pathSegmentsToTraverseLength = includeLastSegment ? strings.length : strings.length - 1;
      if (pathSegmentsToTraverseLength == 0) {
        if (getStat(uri) == null) {
          throw new FileNotFoundExceptionFast("file does not exist at: " + unknownUriStr);
        }
      }
      for (int i = 0; i < pathSegmentsToTraverseLength; i++) {
        if (!strings[i].equals("")) {
          DocumentStat childStat = findFile(uri, strings[i]);
          if (childStat != null) {
            if (childStat.isDirectory()) {
              uri = childStat.getInternalUri();
            } else if (i == pathSegmentsToTraverseLength - 1) {
              // we are at the last part to traverse, its our destination, doesn't matter if its a
              // file or directory
              uri = childStat.getInternalUri();
            } else {
              // child doc is a file
              throw new IOExceptionFast(
                "There's a document with the same name as the one we are trying to traverse at: '"
                  + childStat.getUri()
                  + "'");
            }
          } else {
            if (createIfDirectoryNotExist) {
              uri = createDirectory(uri, strings[i]);
            } else {
              throw new FileNotFoundExceptionFast(
                "Cannot traverse to the pointed document. Document '"
                  + strings[i]
                  + "'"
                  + " does not exist in '"
                  + uri
                  + "'");
            }
          }
        }
      }
    }

    String documentId = DocumentsContract.getTreeDocumentId(uri);
    if (DocumentsContract.isDocumentUri(context, uri)) {
      documentId = DocumentsContract.getDocumentId(uri);
    }
    return DocumentsContract.buildDocumentUriUsingTree(baseUri, documentId);
  }

  private Uri buildDocumentUriUsingTree(Uri treeUri) {
    String documentId = DocumentsContract.getTreeDocumentId(treeUri);
    if (DocumentsContract.isDocumentUri(context, treeUri)) {
      documentId = DocumentsContract.getDocumentId(treeUri);
    }
    return DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId);
  }

  // from https://www.reddit.com/r/androiddev/comments/orytnx/fixing_treedocumentfilefindfile_lousy_performance/
  // with modifications
  @Nullable
  private DocumentStat findFile(@NonNull Uri treeUri, @NonNull String displayName) {
    final ContentResolver resolver = context.getContentResolver();
    final Uri childrenUri = getChildrenDocumentFromTreeUri(treeUri);

    try (Cursor c =
           resolver.query(
             childrenUri,
             queryColumns,
             null,
             null,
             null)) {
      if (c != null) {
        while (c.moveToNext()) {
          if (displayName.equals(c.getString(1))) {
            return new DocumentStat(c, treeUri);
          }
        }
      }
    }

    return null;
  }

  @Nullable
  private DocumentStat getStat(@NonNull Uri uri) {
    if (uri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
      File file = new File(uri.getPath());
      return new DocumentStat(file);
    }

    final ContentResolver resolver = context.getContentResolver();
    try (Cursor c =
           resolver.query(
             uri,
             queryColumns,
             null,
             null,
             null)) {
      if (c != null && c.moveToNext()) {
        return new DocumentStat(c, uri);
      }
    }

    return null;
  }

  private Uri createDirectory(@NonNull Uri parentTreeUri, @NonNull String name) throws IOException {
    Uri createdDir = DocumentsContract.createDocument(
      context.getContentResolver(), buildDocumentUriUsingTree(parentTreeUri), DocumentsContract.Document.MIME_TYPE_DIR,
      name);
    if (createdDir == null) {
      throw new IOExceptionFast("Could not create directory in " + parentTreeUri + " with name " + name);
    }

    return createdDir;
  }

  private static final String[] queryColumns = new String[]{
    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
    DocumentsContract.Document.COLUMN_MIME_TYPE,
    DocumentsContract.Document.COLUMN_SIZE,
    DocumentsContract.Document.COLUMN_LAST_MODIFIED,
  };

  private Uri getChildrenDocumentFromTreeUri(@NonNull Uri treeUri) {
    String documentId = DocumentsContract.getTreeDocumentId(treeUri);
    if (DocumentsContract.isDocumentUri(context, treeUri)) {
      documentId = DocumentsContract.getDocumentId(treeUri);
    }
    return DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId);
  }

  /**
   * simply returning writable array is more efficient I guess
   */
  @Nullable
  private WritableArray queryListFiles(@NonNull Uri uri) {
    if (uri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
      File parentFile = new File(uri.getPath()).getParentFile();
      if (!parentFile.canRead()) {
        throw new SecurityExceptionFast("Permission Denial: Cannot read directory at " + uri.getPath());
      }
      WritableArray stats = Arguments.createArray();
      for (File file : parentFile.listFiles()) {
        stats.pushMap(new DocumentStat(file).getWritableMap());
      }
      return stats;
    }

    final ContentResolver resolver = context.getContentResolver();
    final Uri children = getChildrenDocumentFromTreeUri(uri);

    WritableArray stats = Arguments.createArray();

    try (Cursor c =
           resolver.query(
             children,
             queryColumns,
             null,
             null,
             null)) {
      if (c != null && c.getCount() > 0) {
        while (c.moveToNext()) {
          stats.pushMap(new DocumentStat(c, uri).getWritableMap());
        }
        return stats;
      }
    }
    return stats;
  }

  private static void deleteRecursive(final File fileOrDirectory) throws IOException {
    if (fileOrDirectory.isDirectory()) {
      for (File child : fileOrDirectory.listFiles()) {
        deleteRecursive(child);
      }
    }

    if (fileOrDirectory.exists()) {
      final boolean result = fileOrDirectory.delete();
      if (!result) {
        throw new IOExceptionFast("Cannot delete file at: " + fileOrDirectory.getAbsolutePath());
      }
    }
  }

  private void unlink(final Uri uri) throws IOException {
    final boolean result = DocumentsContract.deleteDocument(context.getContentResolver(), uri);
    if (!result) {
      throw new IOExceptionFast("Cannot delete file at: " + uri);
    }
  }

  private Uri renameTo(final Uri uri, final String newName) throws IOException {
    final Uri newUri = DocumentsContract.renameDocument(context.getContentResolver(), uri, newName);
    if (newUri == null) {
      throw new IOExceptionFast("Failed to rename file at: " + uri + " to " + newName);
    }
    final String renameResult = UriHelper.getFileName(newUri.toString());
    if (!renameResult.equals(newName)) {
      throw new RenameFailedException(uri, newName, newUri, renameResult);
    }
    return newUri;
  }

  private Uri createFile(final String unknownStr, final String mimeType) throws IOException {
    Uri uri = null;

    try {
      uri = getDocumentUri(unknownStr, false, true);
    } catch (FileNotFoundException ignored) {
    }

    if (uri != null) {
      throw new IOExceptionFast("a file or directory already exist at: " + uri);
    }

    uri = UriHelper.getUnifiedUri(unknownStr);

    if (uri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
      File file = new File(uri.getPath());
      file.getParentFile().mkdirs();
      boolean created = file.createNewFile();
      if (!created) {
        throw new IOExceptionFast("could not create file at: " + unknownStr);
      }
      return uri;
    }

    Uri parentDirOfFile = getDocumentUri(unknownStr, true, false);

    // it should be safe because user cannot select sd root or primary root
    // and any other path would have at least one '/' to provide a file name in a folder
    String fileName = UriHelper.getFileName(unknownStr);
    if (fileName.indexOf(':') != -1) {
      throw new IOExceptionFast(
        "Invalid file name: Could not extract filename from uri string provided");
    }

    // maybe edited maybe not
    String correctFileName = fileName;

    // only files with mime type are special, so we treat it special
    if (mimeType != null && !mimeType.equals("")) {
      int indexOfDot = fileName.indexOf('.');
      // len - 1 because there should be an extension that has at least 1 letter
      if (indexOfDot != -1 && indexOfDot < fileName.length() - 1) {
        correctFileName = fileName.substring(0, indexOfDot);
      }
    }

    Uri createdFile = DocumentsContract.createDocument(
      context.getContentResolver(),
      parentDirOfFile,
      mimeType != null && !mimeType.equals("") ? mimeType : "*/*",
      correctFileName
    );

    if (createdFile == null) {
      throw new IOExceptionFast(
        "File creation failed without any specific error for '" + fileName + "'");
    }

    String createdFileName = UriHelper.getFileName(createdFile.toString());

    if (!createdFileName.equals(fileName)) {
      // some times setting mimetypes causes name changes, this is to prevent that.
      try {
        createdFile = renameTo(createdFile, fileName);
      } catch (RenameFailedException e) {
        unlink(e.getResultUri());
        throw new IOExceptionFast(
          "The created file name was not as expected: input name was '"
            + e.getInputName()
            + "' "
            + "but got: '"
            + e.getResultName());
      }
    }

    return createdFile;
  }

  // all public methods SHOULD be below here
  // and MUST start an Async task

  public void listFiles(final String unknownStr, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, false, true);
          return queryListFiles(uri);
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void stat(final String unknownStr, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, false, true);
          return getStat(uri).getWritableMap();
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void mkdir(final String unknownStr, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, true, true);
          return getStat(uri).getWritableMap();
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void unlink(final String unknownStr, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, false, true);

          // this if makes a difference in speed for internal files
          if (uri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
            deleteRecursive(new File(uri.getPath())); // throws if it cannot delete the file
          } else {
            // fortunately we don't need recurse here
            unlink(uri);
          }

          return true;
        } catch (FileNotFoundException e) {
          return true;
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void createFile(final String unknownStr, final String mimeType, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = createFile(unknownStr, mimeType);
          return getStat(uri).getWritableMap();
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void hasPermission(final String uriString, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        // list of all persisted permissions for our app
        List<UriPermission> uriList = context.getContentResolver().getPersistedUriPermissions();
        for (UriPermission uriPermission : uriList) {
          if (permissionMatchesAndHasAccess(uriPermission, UriHelper.normalize(uriString))) {
            return true;
          }
        }
        return false;
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void renameTo(final String unknownStr, final String newName, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, false, true);
          return getStat(renameTo(uri, newName)).getWritableMap();
        } catch (Exception e) {
          return e;
        }

      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void exists(final String unknownStr, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, false, true);
          return uri != null;
        } catch (FileNotFoundException e) {
          return false;
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          promise.resolve(false);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void readFile(String unknownStr, final String encoding, final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri = getDocumentUri(unknownStr, false, true);
          DocumentStat stats = getStat(uri);
          if (stats == null) {
            throw new FileNotFoundExceptionFast("'" + unknownStr + "' does not exist");
          }

          byte[] bytes;
          int bytesRead;
          int length;

          InputStream inputStream = context.getContentResolver().openInputStream(uri);

          length = inputStream.available();
          bytes = new byte[length];
          bytesRead = inputStream.read(bytes);
          inputStream.close();

          String inferredEncoding = encoding;
          if (inferredEncoding == null) {
            inferredEncoding = "";
          }

          switch (inferredEncoding.toLowerCase()) {
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
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }

  public void writeFile(
    String unknownStr,
    String data,
    String encoding,
    String mimeType,
    boolean append,
    final Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri uri;

          try {
            uri = getDocumentUri(unknownStr, false, true);
            if (uri == null) {
              throw new FileNotFoundExceptionFast();
            }
          } catch (FileNotFoundException e) {
            uri = createFile(unknownStr, mimeType);
          }

          byte[] bytes = GeneralHelper.stringToBytes(data, encoding);

          try (OutputStream out =
                 context
                   .getContentResolver()
                   .openOutputStream(uri, append ? "wa" : "wt")) {
            out.write(bytes);
          }

          return null;
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
  }


  public void transferFile(
    String unknownSrcUri, String unknownDestUri, boolean replaceIfDestExists, boolean copy, Promise promise) {
    Async.execute(new Async.Task<Object>() {
      @Override
      public Object doAsync() {
        try {
          Uri srcUri = getDocumentUri(unknownSrcUri, false, true);
          DocumentStat srcStats = getStat(srcUri);

          if (srcStats == null) {
            throw new FileNotFoundExceptionFast("Document at given Uri does not exist: " + unknownDestUri);
          }

          Uri destUri;
          try {
            destUri = getDocumentUri(unknownDestUri, false, true);
            if (!replaceIfDestExists) {
              DocumentStat destStat = getStat(destUri);
              if (destStat != null) {
                throw new IOExceptionFast("a document with the same name already exists in destination");
              } else {
                throw new FileNotFoundExceptionFast();
              }
            }
          } catch (FileNotFoundException e) {
            destUri = createFile(unknownDestUri, srcStats.getMimeType());
          }

          try (InputStream inStream =
                 context.getContentResolver().openInputStream(srcUri);
               OutputStream outStream =
                 context.getContentResolver().openOutputStream(destUri, "wt")) {
            byte[] buffer = new byte[1024 * 4];
            int length;
            while ((length = inStream.read(buffer)) > 0) {
              outStream.write(buffer, 0, length);
            }
          }

          if (!copy) {
            unlink(srcUri);
          }

          DocumentStat destStat = getStat(destUri);
          if (destStat == null) {
            throw new IOExceptionFast("Unexpected error, destination file does not exist after write was completed, file: " + destUri);
          }
          return destStat.getWritableMap();
        } catch (Exception e) {
          return e;
        }
      }

      @Override
      public void doSync(Object o) {
        if (o instanceof Exception) {
          rejectWithException((Exception) o, promise);
        } else {
          promise.resolve(o);
        }
      }
    });
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
                // stat is async
                stat(uri.toString(), promise);
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
          public void onNewIntent(Intent intent) {
          }
        };

      context.addActivityEventListener(activityEventListener);

      Activity activity = context.getCurrentActivity();
      if (activity != null) {
        activity.startActivityForResult(intent, DOCUMENT_TREE_REQUEST_CODE);
      } else {
        context.removeActivityEventListener(activityEventListener);
        throw new ExceptionFast("Cannot get current activity, so cannot launch document picker");
      }

    } catch (Exception e) {
      rejectWithException(e, promise);
    }
  }

  public void openDocument(final boolean persist, final boolean multiple, final Promise promise) {
    try {

      Intent intent = new Intent();
      intent.setAction(Intent.ACTION_OPEN_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      if (multiple) {
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
      }
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
            try {
              if (requestCode == DOCUMENT_REQUEST_CODE
                && resultCode == Activity.RESULT_OK
                && intent != null) {
                final Uri uri = intent.getData();
                final ClipData clipData = intent.getClipData();
                if (uri == null && clipData == null) {
                  throw new ExceptionFast(
                    "Unexpected Error: Could not retrieve information about selected documents");
                }

                if (persist) {
                  final int takeFlags =
                    intent.getFlags()
                      & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                      | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

                  if (uri != null) {
                    context.getContentResolver().takePersistableUriPermission(uri, takeFlags);
                  } else {
                    for (int i = 0; i < clipData.getItemCount(); ++i) {
                      ClipData.Item item = clipData.getItemAt(i);
                      Uri clipUri = item.getUri();
                      context.getContentResolver().takePersistableUriPermission(clipUri, takeFlags);
                    }
                  }
                }

                Async.execute(new Async.Task<Object>() {
                  @Override
                  public Object doAsync() {
                    try {
                      WritableArray resolvedDocs = Arguments.createArray();
                      if (uri != null) {
                        resolvedDocs.pushMap(getStat(uri).getWritableMap());
                      } else {
                        for (int i = 0; i < clipData.getItemCount(); ++i) {
                          ClipData.Item item = clipData.getItemAt(i);
                          Uri clipUri = item.getUri();
                          resolvedDocs.pushMap(getStat(clipUri).getWritableMap());
                        }
                      }
                      return resolvedDocs;
                    } catch (Exception e) {
                      return e;
                    }
                  }

                  @Override
                  public void doSync(Object o) {
                    if (o instanceof Exception) {
                      rejectWithException((Exception) o, promise);
                    } else {
                      promise.resolve(o);
                    }
                  }
                });
              } else {
                promise.resolve(null);
              }
            } catch (Exception e) {
              rejectWithException(e, promise);
            } finally {
              context.removeActivityEventListener(activityEventListener);
              activityEventListener = null;
            }
          }

          @Override
          public void onNewIntent(Intent intent) {
          }
        };

      context.addActivityEventListener(activityEventListener);

      Activity activity = context.getCurrentActivity();
      if (activity != null) {
        activity.startActivityForResult(intent, DOCUMENT_REQUEST_CODE);
      } else {
        context.removeActivityEventListener(activityEventListener);
        throw new ExceptionFast("Cannot get current activity, so cannot launch document picker");
      }

    } catch (Exception e) {
      rejectWithException(e, promise);
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
                final Uri uri = intent.getData();

                Async.execute(new Async.Task<Object>() {
                  @Override
                  public Object doAsync() {
                    try {
                      byte[] bytes = GeneralHelper.stringToBytes(data, encoding);
                      try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                        os.write(bytes);
                      }

                      DocumentStat stat = getStat(uri);
                      if (stat == null) {
                        throw new IOExceptionFast("Could not get stats for the saved file");
                      }
                      return stat.getWritableMap();
                    } catch (Exception e) {
                      return e;
                    }
                  }

                  @Override
                  public void doSync(Object o) {
                    if (o instanceof Exception) {
                      rejectWithException((Exception) o, promise);
                    } else {
                      promise.resolve(o);
                    }
                  }
                });
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
          public void onNewIntent(Intent intent) {
          }
        };

      context.addActivityEventListener(activityEventListener);

      Activity activity = context.getCurrentActivity();
      if (activity != null) {
        activity.startActivityForResult(intent, DOCUMENT_CREATE_CODE);
      } else {
        context.removeActivityEventListener(activityEventListener);
        throw new ExceptionFast("Cannot get current activity, so cannot launch document picker");
      }
    } catch (Exception e) {
      rejectWithException(e, promise);
    }
  }

}
