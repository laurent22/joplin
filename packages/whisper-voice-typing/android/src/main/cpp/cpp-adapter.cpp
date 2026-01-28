#include <jni.h>
#include "WhisperVoiceTypingOnLoad.hpp"
#include "JniWrapper.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
    JniWrapper::setJvm(vm);
    return margelo::nitro::whispervoicetyping::initialize(vm);
}

JNIEXPORT void JNICALL JNI_OnUnload(JavaVM* vm, void*) {
    JniWrapper::clearJvm();
}
