package com.reactnativesafx.utils.exceptions;

public class IllegalArgumentExceptionFast extends IllegalArgumentException {
  @Override
  public synchronized Throwable fillInStackTrace() {
    return this;
  }

  public IllegalArgumentExceptionFast(final String message) {
    super(message);
  }
}
