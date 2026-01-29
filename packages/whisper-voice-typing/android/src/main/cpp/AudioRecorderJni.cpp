#include "AudioRecorderJni.hpp"
#include "JniWrapper.hpp"
#include "androidUtil.h"
#include <jni.h>

jclass recorderClass = nullptr;

void AudioRecorderJni::setRecorderClass(jclass globalClassReference) {
    recorderClass = globalClassReference;
}

jclass getRecorderClass() {
    if (recorderClass == nullptr) {
        throw std::runtime_error("recorderClass not set");
    }

    return recorderClass;
}

void callVoidRecorderMethod(JniWrapper& jni, jobject recorder, const char* methodName) {
    jni.withEnv<void>([recorder, methodName] (auto env) -> void {
        LOGD("Call method %s", methodName);
        auto recorderClass = getRecorderClass();
        auto method = env.getMethodId(recorderClass, methodName, "()V");
        env.raw()->CallVoidMethod(recorder, method);
    });
}

AudioRecorderJni::AudioRecorderJni() : jni_() {
    ref_ = jni_.withEnv<jobject>([] (auto env) -> jobject {
        auto recorderClass = getRecorderClass();
        // See https://stackoverflow.com/a/28137717 and https://www.cs.cmu.edu/afs/cs/academic/class/15212-s98/www/java/tutorial/native1.1/implementing/method.html
        auto constructorId = env.getMethodId(recorderClass, "<init>", "()V");
        auto localRecorderRef = env.raw()->NewObject(recorderClass, constructorId);
        // Convert to a global reference to allow the session to persist after the current native method
        // call (if any).
        jobject globalRecorderRef = env.newGlobalRef(localRecorderRef);

        // TODO: Check whether this is necessary. The JNI *should* auto-free local references at the end
        // of JNI method calls, but it can sometimes be good to free data explicitly to avoid memory leaks.
        // (When does the native method call start/stop?)
        env.deleteLocalRef(localRecorderRef);

        return globalRecorderRef;
    });
}

AudioRecorderJni::~AudioRecorderJni() {
    LOGD("Destructor start: AudioRecorderJni");
    auto recorderRef = ref_;
    ref_ = nullptr;

    jni_.withEnv<void>([recorderRef] (auto env) {
        env.deleteGlobalRef(recorderRef);
    });
    LOGD("Destructor end: AudioRecorderJni");
}

void AudioRecorderJni::start() {
    callVoidRecorderMethod(jni_, ref_, "start");
}

void AudioRecorderJni::stop() {
    callVoidRecorderMethod(jni_, ref_, "close");
}

void AudioRecorderJni::waitForData(double seconds) {
    jni_.withEnv<void>([recorder = ref_, seconds = seconds] (JniInterface& env) -> void {
        auto recorderClass = getRecorderClass();
        auto methodId = env.getMethodId(recorderClass, "bufferAdditionalData", "(D)V");
        env.raw()->CallVoidMethod(recorder, methodId, seconds);
    });
}

void AudioRecorderJni::pullAvailable(std::vector<float>& out) {
    jni_.withEnv<void>([recorder = ref_, &out] (auto env) {
        auto recorderClass = getRecorderClass();
        auto methodId = env.getMethodId(recorderClass, "pullAvailable", "()[F");
        auto data = static_cast<jfloatArray>(env.raw()->CallObjectMethod(recorder, methodId));
        auto pData = env.raw()->GetFloatArrayElements(data, 0);
        jsize lenAudioData = env.raw()->GetArrayLength(data);

        for (jsize i = 0; i < lenAudioData; i++) {
            out.push_back(pData[i]);
        }

        // JNI_ABORT: "free the buffer without copying back the possible changes", pass 0 to copy
        // changes (there should be no changes)
        env.raw()->ReleaseFloatArrayElements(data, pData, JNI_ABORT);
    });
}
