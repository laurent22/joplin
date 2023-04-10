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

  /**
   * Cursor columns must be in the following format:
   * 0 - DocumentsContract.Document.COLUMN_DOCUMENT_ID
   * 1 - DocumentsContract.Document.COLUMN_DISPLAY_NAME
   * 2 - DocumentsContract.Document.COLUMN_MIME_TYPE
   * 3 - DocumentsContract.Document.COLUMN_SIZE
   * 4 - DocumentsContract.Document.COLUMN_LAST_MODIFIED
   *
   * @param uri if this is a tree uri, it must be in it's simplified form
   *            (before being processed for the library)
   */
  public DocumentStat(Cursor c, final Uri uri) {
    if (DocumentsContract.isTreeUri(uri)) {
      final Uri tree = DocumentsContract.buildTreeDocumentUri(uri.getAuthority(), DocumentsContract.getTreeDocumentId(uri));
      this.internalUri = DocumentsContract.buildDocumentUriUsingTree(tree, c.getString(0));

      if (uri.toString().contains("document/raw") || !c.getString(0).contains(DocumentsContract.getTreeDocumentId(uri))) {
        this.uri = this.internalUri;
      } else {
        this.uri = DocumentsContract.buildTreeDocumentUri(uri.getAuthority(), c.getString(0));
      }
    } else {
      this.uri = uri;
      this.internalUri = this.uri;
    }

    final int mimeTypeColIndex = c.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE);
    final int sizeColIndex = c.getColumnIndex(DocumentsContract.Document.COLUMN_SIZE);
    final int lastModifiedColIndex = c.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);

    this.displayName = c.getString(1);

    if (mimeTypeColIndex != -1) {
      this.mimeType = c.getString(mimeTypeColIndex);
    } else {
      this.mimeType = "*/*";
    }

    if (sizeColIndex != -1) {
      this.size = c.getLong(sizeColIndex);
    } else {
      this.size = -1;
    }

    if (lastModifiedColIndex != -1) {
      this.lastModified = c.getLong(lastModifiedColIndex);
    }else {
      this.lastModified = System.currentTimeMillis();
    }

    this.isDirectory = DocumentsContract.Document.MIME_TYPE_DIR.equals(this.mimeType);
  }

  public DocumentStat(final File file) {
    this.uri = Uri.fromFile(file);
    this.internalUri = this.uri;
    this.displayName = file.getName();
    this.lastModified = file.lastModified();
    this.size = file.length();
    this.isDirectory = file.isDirectory();
    if (this.isDirectory) {
      this.mimeType = DocumentsContract.Document.MIME_TYPE_DIR;
    } else {
      this.mimeType = getTypeForName(file.getName());
    }
  }

  public WritableMap getWritableMap() {
    WritableMap fileMap = Arguments.createMap();
    fileMap.putString("uri", UriHelper.denormalize(uri));
    fileMap.putString("name", displayName);
    if (isDirectory) {
      fileMap.putString("type", "directory");
    } else {
      fileMap.putString("type", "file");
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
