package com.reactnativesafx.utils;

import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.webkit.MimeTypeMap;

import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import java.io.File;

@RequiresApi(api = Build.VERSION_CODES.N)
public class DocumentStat {
  private final Uri uri;
  private final Uri internalUri;
  private final String displayName;
  private final String mimeType;
  private final Boolean isDirectory;
  private final long size;
  private final long lastModified;
  private static final String encodedSlash = Uri.encode("/");
  private static final String PATH_DOCUMENT = "document";

  /**
   * Cursor columns must be in the following format:
   * 0 - DocumentsContract.Document.COLUMN_DOCUMENT_ID
   * 1 - DocumentsContract.Document.COLUMN_DISPLAY_NAME
   * 2 - DocumentsContract.Document.COLUMN_MIME_TYPE
   * 3 - DocumentsContract.Document.COLUMN_SIZE
   * 4 - DocumentsContract.Document.COLUMN_LAST_MODIFIED
   *  @param uri if this is a tree uri, it must be in it's simplified form
   *            (before being processed for the library)
   *
   *
   */
  public DocumentStat(Cursor c, final Uri uri) {
    if (DocumentsContract.isTreeUri(uri)) {
      // this is to make sure urls that are going out of this library are always simple to use
      // so tree Uris passed in must always be
      this.uri = DocumentsContract.buildTreeDocumentUri(uri.getAuthority(), c.getString(0));
      this.internalUri = DocumentsContract.buildDocumentUriUsingTree(uri,  c.getString(0));
    } else {
      this.uri = DocumentsContract.buildDocumentUri(uri.getAuthority(), c.getString(0));
      this.internalUri = this.uri;
    }


    this.displayName = c.getString(1);
    this.mimeType = c.getString(2);
    this.size = c.getLong(3);
    this.lastModified = c.getLong(4);
    this.isDirectory = DocumentsContract.Document.MIME_TYPE_DIR.equals(this.mimeType);
  }

  public DocumentStat(final File file) {
    this.uri = Uri.fromFile(file);
    this.internalUri = this.uri;
    this.displayName = file.getName();
    this.lastModified = file.lastModified();
    this.size = file.length();
    this.isDirectory = file.isDirectory();
    if(this.isDirectory) {
      this.mimeType = DocumentsContract.Document.MIME_TYPE_DIR;
    } else {
      this.mimeType = getTypeForName(file.getName());
    }
  }

  public WritableMap getWritableMap() {
    WritableMap fileMap = Arguments.createMap();
    fileMap.putString("uri", UriHelper.denormalize(uri));
    fileMap.putString("name",  displayName);
    if (isDirectory) {
      fileMap.putString("type",  "directory");
    } else {
      fileMap.putString("type",  "file");
    }
    fileMap.putString("mime", mimeType);
    fileMap.putDouble("size", size);
    fileMap.putDouble("lastModified", lastModified);
    return fileMap;
  }

  public String getUri() {
    return UriHelper.denormalize(uri);
  }
  public String getDisplayName() {
    return displayName;
  }
  public String getMimeType() {
    return mimeType;
  }
  public Boolean isDirectory() {
    return this.isDirectory;
  }
  public long getSize() {
    return size;
  }
  public long getLastModified() {
    return lastModified;
  }

  private static String getTypeForName(String name) {
    final int lastDot = name.lastIndexOf('.');
    if (lastDot >= 0) {
      final String extension = name.substring(lastDot + 1).toLowerCase();
      final String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
      if (mime != null) {
        return mime;
      }
    }

    return "application/octet-stream";
  }


  public Uri getInternalUri() {
    return internalUri;
  }
}
