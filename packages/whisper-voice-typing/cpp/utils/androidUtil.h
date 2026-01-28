#pragma once

#include <android/log.h>

// Use macros for these rather than functions. Functions generate a "may be unsafe"
// warning because the compiler can't check that the first argument is a string
// literal.
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, "Whisper::JNI", __VA_ARGS__);
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, "Whisper::JNI", __VA_ARGS__);
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, "Whisper::JNI", __VA_ARGS__);
