#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

	class NativeWhisperModule : public NativeWhisperModuleCxxSpec<NativeWhisperModule> {
		public:
			NativeWhisperModule(std::shared_ptr<CallInvoker> jsInvoker);
			std::string transcribe(jsi::Runtime& rt, std::string audioData);
	};

} // namespace facebook::react
