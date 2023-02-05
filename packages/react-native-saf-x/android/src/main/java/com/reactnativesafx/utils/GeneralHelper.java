package com.reactnativesafx.utils;

import android.util.Base64;

import java.nio.charset.StandardCharsets;

public class GeneralHelper {
  /**
   * String to byte converter method
   *
   * @param data     Raw data in string format
   * @param encoding Decoder name
   * @return Converted data byte array
   */
  public static byte[] stringToBytes(String data, String encoding) {
    if (encoding != null) {
      if (encoding.equalsIgnoreCase("ascii")) {
        return data.getBytes(StandardCharsets.US_ASCII);
      } else if (encoding.toLowerCase().contains("base64")) {
        return Base64.decode(data, Base64.NO_WRAP);
      } else if (encoding.equalsIgnoreCase("utf8")) {
        return data.getBytes(StandardCharsets.UTF_8);
      }
    }
    return data.getBytes(StandardCharsets.UTF_8);
  }
}
