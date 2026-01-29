
#include "JniWrapper.hpp"
#include <jni.h>
#include <stdexcept>
#include <sstream>
#include "androidUtil.h"

JavaVM* vm_ = nullptr;

class NotReadyException : public std::runtime_error {
public:
    NotReadyException(): std::runtime_error("JVM runtime not ready!") { }
};

class JniException : public std::runtime_error {
public:
    explicit JniException(const std::string& message): std::runtime_error(message) { }
};

class JniEnvLoadFailureException : public JniException {
public:
    explicit JniEnvLoadFailureException(const std::string& message): JniException(message) { }
};

class JniEnvCleanupFailureException : public JniException {
public:
    explicit JniEnvCleanupFailureException(const std::string& message): JniException(message) { }
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
JNIEnv* attachCurrentThread() {
    JNIEnv* env = nullptr;
    jint result = getJvm()->AttachCurrentThread(&env, nullptr);
    if (result != JNI_OK) {
        std::stringstream stream;
        stream << "JVM GetEnv failed. Code: " << result;
        throw JniEnvLoadFailureException(stream.str());
    }
    return env;
}

JniWrapper::JniWrapper() {
    env_ = runAndWait<JNIEnv*>([] {
        return attachCurrentThread();
    });
}

JniWrapper::~JniWrapper() {
    runAndWait<void>([] {
        jint code = getJvm()->DetachCurrentThread();
        if (code != JNI_OK) {
            std::stringstream stream;
            stream << "JVM DetachCurrentThread failed. Code: " << code;
            throw JniEnvCleanupFailureException(stream.str());
        }
    });
}

void JniWrapper::setJvm(JavaVM *vm) {
    vm_ = vm;
}

void JniWrapper::clearJvm() {
    vm_ = nullptr;
}


jclass JniInterface::findClass(const std::string &path) {
    LOGD("Searching for class %s...", path.c_str());

    auto targetClass = env_->FindClass(path.c_str());
    if (targetClass == NULL) {
        LOGD("failed to find class %s", path.c_str());
        std::stringstream message;
        message << "Not found (class): " << path;
        throw JniItemNotFoundException(message.str());
    }
    return targetClass;
}

jmethodID JniInterface::getStaticMethodId(jclass target, const std::string& path, const std::string& signature) {
    auto methodId = env_->GetStaticMethodID(target, path.c_str(), signature.c_str());
    if (methodId == NULL) {
        std::stringstream message;
        message << "Not found: Static method on class: " << path << " with signature " << signature;
        throw JniItemNotFoundException(message.str());
    }
    return methodId;
}

jmethodID JniInterface::getMethodId(jclass target, const std::string &path,
                                   const std::string &methodSignature) {
    auto methodId = env_->GetMethodID(target, path.c_str(), methodSignature.c_str());
    if (methodId == NULL) {
        std::stringstream message;
        message << "Not found: Method on class: " << path;
        throw JniItemNotFoundException(message.str());
    }
    return methodId;
}

jobject JniInterface::newGlobalRef(jobject target) {
    if (target == nullptr) {
        throw JniNullPointerException("Attempted to create a global ref from a nullptr local ref");
    }

    return env_->NewGlobalRef(target);
}

jclass JniInterface::newGlobalRef(jclass target) {
    // A jclass is a subtype of jobject. See https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/types.html.
    return static_cast<jclass>(env_->NewGlobalRef(static_cast<jobject>(target)));
}

void JniInterface::deleteGlobalRef(jobject target) {
    if (target == nullptr) {
        throw JniNullPointerException("Attempted to delete a nullptr global ref");
    }

    env_->DeleteGlobalRef(target);
}

void JniInterface::deleteLocalRef(jobject target) {
    if (target == nullptr) {
        throw JniNullPointerException("Attempted to delete a nullptr local ref");
    }

    env_->DeleteLocalRef(target);
}

JNIEnv* JniInterface::raw() {
    return env_;
}
