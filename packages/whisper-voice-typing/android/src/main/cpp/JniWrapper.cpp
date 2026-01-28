
#include "JniWrapper.h"
#include <jni.h>
#include <stdexcept>
#include <sstream>

JavaVM* vm_ = nullptr;

class NotReadyException : public std::runtime_error {
public:
    NotReadyException(): std::runtime_error("JVM runtime not ready!") { }
};

class JniEnvLoadFailureException : public std::runtime_error {
public:
    explicit JniEnvLoadFailureException(const std::string& message): std::runtime_error(message) { }
};

class JniItemNotFoundException : public std::logic_error {
public:
    explicit JniItemNotFoundException(const std::string& message): std::logic_error(message) { }
};

class JniNullPointerException : public std::logic_error {
public:
    explicit JniNullPointerException(const std::string& message): std::logic_error(message) { }
};

/// Returns a pointer to the current global JVM instance.
/// This pointer is managed by ::setJvm and ::clearJvm.
JavaVM* getJvm() {
    if (vm_ == nullptr) {
        throw NotReadyException { };
    }
    return vm_;
}

/// Returns a pointer to the current JNI environment. Throws on failure.
JNIEnv* getJniEnv() {
    JNIEnv* env = nullptr;
    jint result = getJvm()->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
    if (result != JNI_OK) {
        std::stringstream stream;
        stream << "JVM GetEnv failed. Code: " << result;
        throw JniEnvLoadFailureException(stream.str());
    }
    return env;
}

JniWrapper::JniWrapper() = default;

void JniWrapper::setJvm(JavaVM *vm) {
    vm_ = vm;
}

void JniWrapper::clearJvm() {
    vm_ = nullptr;
}

JNIEnv& JniWrapper::env() {
    return *getJniEnv();
}

jclass JniWrapper::findClass(const std::string &path) {
    auto env = getJniEnv();
    auto targetClass = env->FindClass(path.c_str());
    if (targetClass == NULL) {
        std::stringstream message;
        message << "Not found (class): " << path;
        throw JniItemNotFoundException(message.str());
    }
    return targetClass;
}

jmethodID JniWrapper::findStaticMethodId(jclass target, const std::string& path, const std::string& signature) {
    auto env = getJniEnv();
    auto methodId = env->GetStaticMethodID(target, path.c_str(), signature.c_str());
    if (methodId == NULL) {
        std::stringstream message;
        message << "Not found: Static method on class: " << path;
        throw JniItemNotFoundException(message.str());
    }
    return methodId;
}

jobject JniWrapper::callStaticObjectMethod(jclass target, jmethodID id) {
    return getJniEnv()->CallStaticObjectMethod(target, id);
}

jmethodID JniWrapper::findMethodId(jclass target, const std::string &path,
                                   const std::string &methodSignature) {
    auto env = getJniEnv();
    auto methodId = env->GetMethodID(target, path.c_str(), methodSignature.c_str());
    if (methodId == NULL) {
        std::stringstream message;
        message << "Not found: Method on class: " << path;
        throw JniItemNotFoundException(message.str());
    }
    return methodId;
}

void JniWrapper::callVoidMethod(jobject target, jmethodID id) {
    return getJniEnv()->CallVoidMethod(target, id);
}

jobject JniWrapper::newGlobalRef(jobject target) {
    if (target == nullptr) {
        throw JniNullPointerException("Attempted to create a global ref from a nullptr local ref");
    }

    return getJniEnv()->NewGlobalRef(target);
}

void JniWrapper::deleteGlobalRef(jobject target) {
    if (target == nullptr) {
        throw JniNullPointerException("Attempted to delete a nullptr global ref");
    }

    getJniEnv()->DeleteGlobalRef(target);
}

void JniWrapper::deleteLocalRef(jobject target) {
    if (target == nullptr) {
        throw JniNullPointerException("Attempted to delete a nullptr local ref");
    }

    getJniEnv()->DeleteLocalRef(target);
}
