package com.reactnativesafx.utils.exceptions;

import android.net.Uri;

import java.io.IOException;

public class RenameFailedException extends IOException {

  @Override
  public synchronized Throwable fillInStackTrace() {
    return this;
  }

  private final Uri inputUri;
  private final String inputName;

  private final Uri resultUri;
  private final String resultName;


  public RenameFailedException(final Uri inputUri, final String inputName, final Uri resultUri, final String resultName) {
    super("Failed to rename file at: " + inputUri + "  expected: '"
      + inputName
      + "'"
      + "but got: "
      + resultName);
    this.inputUri = inputUri;
    this.inputName = inputName;
    this.resultUri = resultUri;
    this.resultName = resultName;
  }

  public Uri getInputUri() {
    return inputUri;
  }

  public String getInputName() {
    return inputName;
  }

  public Uri getResultUri() {
    return resultUri;
  }

  public String getResultName() {
    return resultName;
  }
}
