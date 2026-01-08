#include "NativeWhisperModule.h"

namespace facebook::react {

    NativeWhisperModule::NativeWhisperModule(std::shared_ptr<CallInvoker> jsInvoker)
            : NativeWhisperModuleCxxSpec(std::move(jsInvoker)) {}

    std::string NativeWhisperModule::transcribe(jsi::Runtime &rt, std::string audio) {
        return std::string("TEST!");
    }

}