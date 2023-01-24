package com.reactnativesafx.utils.exceptions;

import java.io.FileNotFoundException;

public class FileNotFoundExceptionFast extends FileNotFoundException {
  @Override
  public synchronized Throwable fillInStackTrace() {
    return this;
  }

  public FileNotFoundExceptionFast(final String message) {
    super(message);
  }

  public FileNotFoundExceptionFast() {
    super();
  }
}
