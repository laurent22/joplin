package com.reactnativesafx.utils.exceptions;

public class SecurityExceptionFast extends SecurityException {
  @Override
  public synchronized Throwable fillInStackTrace() {
    return this;
  }

  public SecurityExceptionFast(final String message) {
    super(message);
  }
}
