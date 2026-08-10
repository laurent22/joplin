#include <jni.h>
#include "WhisperVoiceTypingOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
    return margelo::nitro::whispervoicetyping::initialize(vm);
}
