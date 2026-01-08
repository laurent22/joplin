/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * MIT License
 * 
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * -----
 *
 * Customized for Joplin, as per React Native's "Cross-Platform with C++" documentation.
 * https://reactnative.dev/docs/0.81/the-new-architecture/pure-cxx-modules
 */

// This C++ file is part of the default configuration used by apps and is placed
// inside react-native to encapsulate it from user space (so you won't need to
// touch C++/Cmake code at all on Android).
//
// If you wish to customize it (because you want to manually link a C++ library
// or pass a custom compilation flag) you can:
//
// 1. Copy this CMake file inside the `android/app/src/main/jni` folder of your
// project
// 2. Copy the OnLoad.cpp (in this same folder) file inside the same folder as
// above.
// 3. Extend your `android/app/build.gradle` as follows
//
// android {
//    // Other config here...
//    externalNativeBuild {
//        cmake {
//            path "src/main/jni/CMakeLists.txt"
//        }
//    }
// }

#include <DefaultComponentsRegistry.h>
#include <DefaultTurboModuleManagerDelegate.h>
#include <FBReactNativeSpec.h>
#include <autolinking.h>
#include <fbjni/fbjni.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

// Joplin edit: Import shared native modules:
#include <NativeWhisperModule.h>

#ifdef REACT_NATIVE_APP_CODEGEN_HEADER
#include REACT_NATIVE_APP_CODEGEN_HEADER
#endif
#ifdef REACT_NATIVE_APP_COMPONENT_DESCRIPTORS_HEADER
#include REACT_NATIVE_APP_COMPONENT_DESCRIPTORS_HEADER
#endif

namespace facebook::react {

void registerComponents(
    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry) {
  // Custom Fabric Components go here. You can register custom
  // components coming from your App or from 3rd party libraries here.
  //
  // providerRegistry->add(concreteComponentDescriptorProvider<
  //        MyComponentDescriptor>());

  // We link app local components if available
#ifdef REACT_NATIVE_APP_COMPONENT_REGISTRATION
  REACT_NATIVE_APP_COMPONENT_REGISTRATION(registry);
#endif

  // And we fallback to the components autolinked
  autolinking_registerProviders(registry);
}

std::shared_ptr<TurboModule> cxxModuleProvider(
    const std::string& name,
    const std::shared_ptr<CallInvoker>& jsInvoker) {
  // Here you can provide your CXX Turbo Modules coming from
  // either your application or from external libraries. The approach to follow
  // is similar to the following (for a module called `NativeCxxModuleExample`):
  //
  // if (name == NativeCxxModuleExample::kModuleName) {
  //   return std::make_shared<NativeCxxModuleExample>(jsInvoker);
  // }
  
  // Joplin edit: Register the custom Whisper.cpp modules
  if (name == NativeWhisperModule::kModuleName) {
    return std::make_shared<NativeWhisperModule>(jsInvoker);
  }

  // And we fallback to the CXX module providers autolinked
  return autolinking_cxxModuleProvider(name, jsInvoker);

  return nullptr;
}

std::shared_ptr<TurboModule> javaModuleProvider(
    const std::string& name,
    const JavaTurboModule::InitParams& params) {
  // Here you can provide your own module provider for TurboModules coming from
  // either your application or from external libraries. The approach to follow
  // is similar to the following (for a library called `samplelibrary`):
  //
  // auto module = samplelibrary_ModuleProvider(name, params);
  // if (module != nullptr) {
  //    return module;
  // }
  // return rncore_ModuleProvider(name, params);

  // We link app local modules if available
#ifdef REACT_NATIVE_APP_MODULE_PROVIDER
  auto module = REACT_NATIVE_APP_MODULE_PROVIDER(name, params);
  if (module != nullptr) {
    return module;
  }
#endif

  // We first try to look up core modules
  if (auto module = FBReactNativeSpec_ModuleProvider(name, params)) {
    return module;
  }

  // And we fallback to the module providers autolinked
  if (auto module = autolinking_ModuleProvider(name, params)) {
    return module;
  }

  return nullptr;
}

} // namespace facebook::react

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [] {
    facebook::react::DefaultTurboModuleManagerDelegate::cxxModuleProvider =
        &facebook::react::cxxModuleProvider;
    facebook::react::DefaultTurboModuleManagerDelegate::javaModuleProvider =
        &facebook::react::javaModuleProvider;
    facebook::react::DefaultComponentsRegistry::
        registerComponentDescriptorsFromEntryPoint =
            &facebook::react::registerComponents;
  });
}
