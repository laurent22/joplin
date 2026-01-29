#include <jni.h>
#include "WhisperVoiceTypingOnLoad.hpp"
#include "JniWrapper.hpp"
#include "AudioRecorderJni.hpp"

// Preload all class references here as per https://developer.android.com/ndk/guides/jni-tips#faq:-why-didnt-findclass-find-my-class
void preloadJavaClassReferences(JavaVM* vm) {
    JNIEnv* env = nullptr;

    jint result = vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6);
    if (result != JNI_OK) {
        throw std::runtime_error("Failed to load Java environment!");
    }

    JniInterface jni { env };
    // jclass is by default a local reference (see https://stackoverflow.com/a/2093300)
    jclass localRecorderClassRef = jni.findClass("com/margelo/nitro/whispervoicetyping/AudioRecorder");
    jclass globalRecorderClassRef = jni.newGlobalRef(localRecorderClassRef);
    jni.deleteLocalRef(localRecorderClassRef);

    AudioRecorderJni::setRecorderClass(globalRecorderClassRef);
}

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
    JniWrapper::setJvm(vm);

    preloadJavaClassReferences(vm);

    return margelo::nitro::whispervoicetyping::initialize(vm);
}

JNIEXPORT void JNICALL JNI_OnUnload(JavaVM*, void*) {
    JniWrapper::clearJvm();
}
