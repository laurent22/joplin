package com.reactnativesafx.utils;

import android.content.ContentResolver;
import android.net.Uri;
import android.os.Build.VERSION_CODES;

import androidx.annotation.RequiresApi;

import java.util.regex.Pattern;

@RequiresApi(api = VERSION_CODES.Q)
public class UriHelper {
  public static final String CONTENT_URI_PREFIX = "content://";
  public static final Pattern DOCUMENT_TREE_PREFIX =
      Pattern.compile("^content://.*?/tree/.+?:.*", Pattern.CASE_INSENSITIVE);

  public static String getLastSegment(String uriString) {

    return Uri.parse(Uri.decode(uriString)).getLastPathSegment();
  }

  public static boolean isContentDocumentTreeUri(String uriString) {
    return DOCUMENT_TREE_PREFIX.matcher(uriString).matches();
  }

  public static String normalize(String uriString) {
    if (isContentDocumentTreeUri(uriString)) {
      // an abnormal uri example:
      // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin/locks/2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json
      // normalized:
      // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin%2Flocks%2F2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json

      // uri parts:
      String[] parts = Uri.decode(uriString).split(":");
      return parts[0] + ":" + parts[1] + Uri.encode(":" + parts[2]);
    }
    return uriString;
  }

  public static String denormalize(String uriString) {
    if (isContentDocumentTreeUri(uriString)) {
      // an normalized uri example:
      // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin%2Flocks%2F2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json
      // denormalized:
      // content://com.android.externalstorage.documents/tree/1707-3F0B/Ajoplin/locks/2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json

      return Uri.decode(normalize(uriString));
    }
    return uriString;
  }

  public static String getUnifiedUri(String uriString) throws IllegalArgumentException {
    Uri uri = Uri.parse(uriString);
    if (uri.getScheme() == null) {
      uri = Uri.parse(ContentResolver.SCHEME_FILE + "://" + uriString);
    } else if (!(uri.getScheme().equals(ContentResolver.SCHEME_FILE)
        || uri.getScheme().equals(ContentResolver.SCHEME_CONTENT))) {
      throw new IllegalArgumentException("Invalid Uri: Scheme not supported");
    }
    return uri.toString();
  }
}
