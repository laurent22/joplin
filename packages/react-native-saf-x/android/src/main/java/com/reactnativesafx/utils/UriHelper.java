package com.reactnativesafx.utils;

import android.content.ContentResolver;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;

import androidx.annotation.RequiresApi;

@RequiresApi(api = Build.VERSION_CODES.N)
public class UriHelper {

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

      // uri parts:
      String[] parts = Uri.decode(uri.toString()).split(":");
      return parts[0] + ":" + parts[1] + Uri.encode(":" + parts[2]);
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
      throw new IllegalArgumentException("Invalid Uri: No input was given");
    }
    Uri uri = Uri.parse(unknownUriStr);
    if (uri.getScheme() == null) {
      uri = Uri.parse(ContentResolver.SCHEME_FILE + "://" + unknownUriStr);
    } else if (!(uri.getScheme().equals(ContentResolver.SCHEME_FILE)
      || uri.getScheme().equals(ContentResolver.SCHEME_CONTENT))) {
      throw new IllegalArgumentException("Invalid Uri: Scheme not supported");
    }
    return uri;
  }
}
