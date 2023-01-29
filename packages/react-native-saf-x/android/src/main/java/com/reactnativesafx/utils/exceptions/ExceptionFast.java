package com.reactnativesafx.utils.exceptions;

public class ExceptionFast extends Exception {
  @Override
  public synchronized Throwable fillInStackTrace() {
    return this;
  }

  public ExceptionFast(final String message) {
    super(message);
  }
}
