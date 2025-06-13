// Write C++ code here.
//
// Do not forget to dynamically load the C++ library into your application.
//
// For instance,
//
// In MainActivity.java:
//    static {
//       System.loadLibrary("joplin");
//    }
//
// Or, in MainActivity.kt:
//    companion object {
//      init {
//         System.loadLibrary("joplin")
//      }
//    }
#include <jni.h>
#include <memory>
#include <string>
#include <sstream>
#include <android/log.h>
#include "whisper.h"
#include "utils/WhisperSession.h"
#include "utils/androidUtil.h"
#include "utils/findLongestSilence_test.h"

void log_android(enum ggml_log_level level, const char* message, void* user_data) {
	android_LogPriority priority = level == 4 ? ANDROID_LOG_ERROR : ANDROID_LOG_INFO;
	__android_log_print(priority, "Whisper::JNI::cpp", "%s", message);
}

jstring stringToJava(JNIEnv *env, const std::string& source) {
	return env->NewStringUTF(source.c_str());
}

std::string stringToCXX(JNIEnv *env, jstring jString) {
	const char *jStringChars = env->GetStringUTFChars(jString, nullptr);
	std::string result { jStringChars };
	env->ReleaseStringUTFChars(jString, jStringChars);

	return result;
}

void throwException(JNIEnv *env, const std::string& message) {
	jclass errorClass = env->FindClass("java/lang/Exception");
	env->ThrowNew(errorClass, message.c_str());
}

extern "C"
JNIEXPORT jlong JNICALL
Java_net_cozic_joplin_audio_NativeWhisperLib_00024Companion_init(
		JNIEnv *env,
		jobject thiz,
		jstring modelPath,
		jstring language,
		jstring prompt,
        jboolean useShortAudioContext
) {
	whisper_log_set(log_android, nullptr);

	try {
		auto *pSession = new WhisperSession(
				stringToCXX(env, modelPath), stringToCXX(env, language), stringToCXX(env, prompt), useShortAudioContext
		);
		return (jlong) pSession;
	} catch (const std::exception& exception) {
		LOGW("Failed to init whisper: %s", exception.what());
		throwException(env, exception.what());
		return 0;
	}
}

extern "C"
JNIEXPORT void JNICALL
Java_net_cozic_joplin_audio_NativeWhisperLib_00024Companion_free(JNIEnv *env, jobject thiz,
																 jlong pointer) {
	delete reinterpret_cast<WhisperSession *>(pointer);
}

extern "C"
JNIEXPORT void JNICALL
Java_net_cozic_joplin_audio_NativeWhisperLib_00024Companion_addAudio(JNIEnv *env,
																		   jobject thiz,
																		   jlong pointer,
																		   jfloatArray audio_data) {
	auto *pSession = reinterpret_cast<WhisperSession *> (pointer);
	jfloat *pAudioData = env->GetFloatArrayElements(audio_data, nullptr);
	jsize lenAudioData = env->GetArrayLength(audio_data);
	std::string result;

	try {
		pSession->addAudio(pAudioData, lenAudioData);
	} catch (const std::exception& exception) {
		LOGW("Failed to add to audio buffer: %s", exception.what());
		throwException(env, exception.what());
	}

	// JNI_ABORT: "free the buffer without copying back the possible changes", pass 0 to copy
	// changes (there should be no changes)
	env->ReleaseFloatArrayElements(audio_data, pAudioData, JNI_ABORT);
}

extern "C"
JNIEXPORT jstring JNICALL
Java_net_cozic_joplin_audio_NativeWhisperLib_00024Companion_transcribeNextChunk(JNIEnv *env,
																				jobject thiz,
																				jlong pointer) {
	auto *pSession = reinterpret_cast<WhisperSession *> (pointer);
	std::string result;

	try {
		result = pSession->transcribeNextChunk();
	} catch (const std::exception& exception) {
		LOGW("Failed to run whisper: %s", exception.what());
		throwException(env, exception.what());
        return nullptr;
	}

	return stringToJava(env, result);
}

extern "C"
JNIEXPORT jstring JNICALL
Java_net_cozic_joplin_audio_NativeWhisperLib_00024Companion_transcribeRemaining(JNIEnv *env,
																				jobject thiz,
																				jlong pointer) {
	auto *pSession = reinterpret_cast<WhisperSession *> (pointer);
	std::string result;

	try {
		result = pSession->transcribeAll();
	} catch (const std::exception& exception) {
		LOGW("Failed to run whisper: %s", exception.what());
		throwException(env, exception.what());
        return nullptr;
	}

	return stringToJava(env, result);
}

extern "C"
JNIEXPORT void JNICALL
Java_net_cozic_joplin_audio_NativeWhisperLib_00024Companion_runTests(JNIEnv *env, jobject thiz) {
	try {
		findLongestSilence_test();
	} catch (const std::exception& exception) {
		LOGW("Failed to run tests: %s", exception.what());
		throwException(env, exception.what());
	}
}
