package com.reactnativesafx.utils;

import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// from https://stackoverflow.com/a/73666782/3542461
public class Async {

  private static final ExecutorService executorService = Executors.newCachedThreadPool();

  private static final Handler handler = new Handler(Looper.getMainLooper());

  public static <T> void execute(Task<T> task) {
    executorService.execute(() -> {
      T t = task.doAsync();
      handler.post(() -> {
        task.doSync(t);
      });
    });
  }

  public interface Task<T> {
    T doAsync();

    void doSync(T t);
  }

}
