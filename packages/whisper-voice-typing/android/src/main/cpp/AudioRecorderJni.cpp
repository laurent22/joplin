#include "AudioRecorderJni.h"
#include "JniWrapper.h"

jclass getBuilderClass(JniWrapper jni) {
    return jni.findClass("com/margelo/nitro/whispervoicetyping/AudioRecorderBuilder");
}

jclass getRecorderClass(JniWrapper jni) {
    return jni.findClass("com/margelo/nitro/whispervoicetyping/AudioRecorder");
}

void callVoidRecorderMethod(JniWrapper jni, jobject recorder, const char* methodName) {
    auto recorderClass = getRecorderClass(jni);
    auto method = jni.findMethodId(recorderClass, methodName, "()V");
    jni.callVoidMethod(recorder, method);
    jni.deleteLocalRef(recorderClass);
}

AudioRecorderJni::AudioRecorderJni() {
    JniWrapper jni {};
    jni_ = jni;

    auto builderClass = getBuilderClass(jni);
    // See https://stackoverflow.com/a/28137717 and https://www.cs.cmu.edu/afs/cs/academic/class/15212-s98/www/java/tutorial/native1.1/implementing/method.html
    auto constructorId = jni.findStaticMethodId(
            builderClass,
            "build",
            "()Lcom/margelo/nitro/whispervoicetyping/AudioRecorder"
    );
    auto localRecorderRef = jni.callStaticObjectMethod(builderClass, constructorId);
    // Convert to a global reference to allow the session to persist after the current native method
    // call (if any).
    jobject globalRecorderRef = jni.newGlobalRef(localRecorderRef);

    // TODO: Check whether this is necessary. The JNI *should* auto-free local references at the end
    // of JNI method calls, but it can sometimes be good to free data explicitly to avoid memory leaks.
    // (When does the native method call start/stop?)
    jni.deleteLocalRef(localRecorderRef);
    jni.deleteLocalRef(builderClass);

    ref_ = globalRecorderRef;
}

AudioRecorderJni::~AudioRecorderJni() {
    jni_.deleteGlobalRef(ref_);
    ref_ = nullptr;
}

void AudioRecorderJni::start() {
    callVoidRecorderMethod(jni_, ref_, "start");
}

void AudioRecorderJni::stop() {
    callVoidRecorderMethod(jni_, ref_, "close");
}

void AudioRecorderJni::waitForData(double seconds) {
    auto recorderClass = getRecorderClass(jni_);
    auto methodId = jni_.findMethodId(recorderClass, "bufferAdditionalData", "(F;)V");
    jni_.env().CallVoidMethod(ref_, methodId, seconds);
    jni_.deleteLocalRef(recorderClass);
}

void AudioRecorderJni::pullAvailable(std::vector<float>& out) {
    auto recorderClass = getRecorderClass(jni_);
    auto methodId = jni_.findMethodId(recorderClass, "pullAvailable", "()[F");
    auto data = static_cast<jfloatArray>(jni_.env().CallObjectMethod(ref_, methodId));
    auto pData = jni_.env().GetFloatArrayElements(data, 0);
    jsize lenAudioData = jni_.env().GetArrayLength(data);

    for (jsize i = 0; i < lenAudioData; i++) {
        out.push_back(pData[i]);
    }

    // JNI_ABORT: "free the buffer without copying back the possible changes", pass 0 to copy
    // changes (there should be no changes)
    jni_.env().ReleaseFloatArrayElements(data, pData, JNI_ABORT);
    jni_.deleteLocalRef(recorderClass);
}
