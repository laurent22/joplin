//
// Wraps the JNI, helping to ensure that all JNI calls happen on the same thread.
//
// See https://docs.oracle.com/javase/8/docs/technotes/guides/jni/ for more information
// about the JNI.
//

#pragma once

#include <jni.h>
#include <string>
#include "SingleThread.hpp"

// A wrapper around the JNI environment.
// Constructed by JniWrapper (see JniWrapper::withEnv).
class JniInterface {
public:
    JniInterface(JNIEnv* env): env_{env} {};

    jclass findClass(const std::string& path);

    // Finding methods:
    // - path: Path to the method relative to the container class
    // - signature: Method signature as per https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/types.html#type_signatures
    //              and https://www.cs.cmu.edu/afs/cs/academic/class/15212-s98/www/java/tutorial/native1.1/implementing/method.html
    jmethodID getStaticMethodId(jclass target, const std::string& path, const std::string& signature);
    jmethodID getMethodId(jclass target, const std::string& path, const std::string& signature);

    // Unlike local refs, global refs outlive the current native method call.
    // See https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/design.html#global_and_local_references
    jobject newGlobalRef(jobject localRef);
    jclass newGlobalRef(jclass localRef);
    void deleteGlobalRef(jobject globalRef);
    void deleteGlobalRef(jclass globalRef);
    void deleteLocalRef(jobject localRef);

    // Direct access to the JNI environment
    JNIEnv* raw();

private:
    JNIEnv* env_;
};

// Provides access to a JNIEnv, ensuring that all accesses are done from the same thread.
class JniWrapper : public SingleThread {
public:
    JniWrapper();
    ~JniWrapper();

    // Runs the provided callback in the thread with access to the JNI
    template<typename T>
    T withEnv(std::function<T(JniInterface& jni)> callback) {
        return runAndWait<T>([callback = std::move(callback), env = env_] {
            JniInterface envWrapper { env };
            return callback(envWrapper);
        });
    }

    static void setJvm(JavaVM* vm);
    static void clearJvm();

private:
    JNIEnv* env_ = nullptr;
};
