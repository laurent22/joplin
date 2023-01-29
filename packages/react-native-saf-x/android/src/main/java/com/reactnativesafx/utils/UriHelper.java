package com.reactnativesafx.utils;

import android.content.ContentResolver;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;

import androidx.annotation.RequiresApi;

import com.reactnativesafx.utils.exceptions.IllegalArgumentExceptionFast;

import java.util.List;

@RequiresApi(api = Build.VERSION_CODES.N)
public class UriHelper {
  private static final String PATH_TREE = "tree";
  private static final String PATH_DOCUMENT = "document";

  public static String getFileName(String uriStr) {
    // it should be safe because user cannot select sd root or primary root
    // and any other path would have at least one '/' to provide a file name in a folder
    String fileName = Uri.parse(Uri.decode(uriStr)).getLastPathSegment();
    if (fileName.indexOf(':') != -1) {
      throw new RuntimeException(
        "Invalid file name: Could not extract filename from uri string provided");
    }

    return fileName;
  }

  public static String normalize(String uriString) {
    return normalize(Uri.parse(uriString));
  }

  public static String normalize(Uri uri) {
    if (DocumentsContract.isTreeUri(uri)) {
      // an abnormal uri example:
      // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin/locks/2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json
      // normalized:
      // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin%2Flocks%2F2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json

      if (uri.getPath().indexOf(":") != -1) {
        // uri parts:
        String[] parts = Uri.decode(uri.toString()).split(":");
        return parts[0] + ":" + parts[1] + Uri.encode(":" + parts[2]);
      }
    }
    return uri.toString();
  }

  public static String denormalize(Uri uri) {
    if (DocumentsContract.isTreeUri(uri)) {
      // an normalized uri example:
      // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin%2Flocks%2F2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json
      // denormalized:
      // content://com.android.externalstorage.documents/tree/1707-3F0B/Ajoplin/locks/2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json

      return Uri.decode(normalize(uri));
    }
    return uri.toString();
  }

  public static Uri getUnifiedUri(String unknownUriStr) {
    if (unknownUriStr == null || unknownUriStr.equals("")) {
      throw new IllegalArgumentExceptionFast("Invalid Uri: No input was given");
    }
    Uri uri = Uri.parse(unknownUriStr);
    if (uri.getScheme() == null) {
      uri = Uri.parse(ContentResolver.SCHEME_FILE + "://" + unknownUriStr);
    } else if (!(uri.getScheme().equals(ContentResolver.SCHEME_FILE)
      || uri.getScheme().equals(ContentResolver.SCHEME_CONTENT))) {
      throw new IllegalArgumentExceptionFast("Invalid Uri: Scheme not supported");
    }
    return uri;
  }

  public static boolean isContentUri(Uri uri) {
    return uri != null && ContentResolver.SCHEME_CONTENT.equals(uri.getScheme());
  }

  public static boolean isDocumentUri(Uri uri) {
    if (isContentUri(uri)) {
      final List<String> paths = uri.getPathSegments();
      if (paths.size() >= 4) {
        return PATH_TREE.equals(paths.get(0)) && PATH_DOCUMENT.equals(paths.get(2));
      } else if (paths.size() >= 2) {
        return PATH_DOCUMENT.equals(paths.get(0));
      }
    }
    return false;
  }

}
