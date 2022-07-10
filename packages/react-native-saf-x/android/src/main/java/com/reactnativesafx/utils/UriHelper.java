package com.reactnativesafx.utils;

import android.net.Uri;
import android.os.Build.VERSION_CODES;
import androidx.annotation.RequiresApi;

@RequiresApi(api = VERSION_CODES.Q)
public class UriHelper {
  public static final String CONTENT_URI_PREFIX = "content://";

  public static String getLastSegment(String uriString) {

    return Uri.parse(Uri.decode(uriString)).getLastPathSegment();
  }

  public static String normalize(String uriString) {
    // an abnormal uri example:
    // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin/locks/2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json
    // normalized:
    // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin%2Flocks%2F2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json

    // uri parts:

    String[] parts = Uri.decode(uriString).split(":");
    return parts[0] + ":" + parts[1] + Uri.encode(":" + parts[2]);
  }

  public static String denormalize(String uriString) {
    // an normalized uri example:
    // content://com.android.externalstorage.documents/tree/1707-3F0B%3Ajoplin%2Flocks%2F2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json
    // denormalized:
    // content://com.android.externalstorage.documents/tree/1707-3F0B/Ajoplin/locks/2_2_fa4f9801e9a545a58f1a6c5d3a7cfded.json

    return Uri.decode(normalize(uriString));
  }
}
