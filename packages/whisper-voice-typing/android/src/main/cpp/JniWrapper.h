//
// A set of utilities to make working with the JNI's C API somewhat safer.
//
// See https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec for more information
// about the JNI.
//

#ifndef WHISPERVOICETYPING_EXAMPLE_JNIWRAPPER_H
#define WHISPERVOICETYPING_EXAMPLE_JNIWRAPPER_H

#include <jni.h>
#include <string>

class JniWrapper {
public:
    JniWrapper();

    JNIEnv& env();

    jclass findClass(const std::string& path);
    jmethodID findStaticMethodId(jclass target, const std::string& path, const std::string& methodSignature);
    jobject callStaticObjectMethod(jclass target, jmethodID id);

    jmethodID findMethodId(jclass target, const std::string& path, const std::string& methodSignature);
    void callVoidMethod(jobject target, jmethodID id);

    // Create/destroy references that outlive the current native method call.
    // See https://www.cs.cmu.edu/afs/cs/academic/class/15212-s98/www/java/tutorial/native1.1/implementing/refs.html.
    jobject newGlobalRef(jobject target);
    void deleteGlobalRef(jobject target);

    // Explicitly free a local reference.
    void deleteLocalRef(jobject target);

    static void setJvm(JavaVM* vm);
    static void clearJvm();
};



#endif //WHISPERVOICETYPING_EXAMPLE_JNIWRAPPER_H
