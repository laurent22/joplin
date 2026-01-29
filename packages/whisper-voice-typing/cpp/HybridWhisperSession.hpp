#pragma once

#include <mutex>
#include <memory>

#include "HybridWhisperSessionSpec.hpp"
#include "SessionOptions.hpp"
#include "IAudioRecorder.hpp"
#include "utils/WhisperSession.hpp"

namespace margelo::nitro::whispervoicetyping {
    class HybridWhisperSession : public HybridWhisperSessionSpec {
    public:
        HybridWhisperSession(const SessionOptions& options);

        std::shared_ptr<Promise<void>> startRecording() override;
        std::shared_ptr<Promise<std::string>> convertNext(double seconds) override;
        std::shared_ptr<Promise<std::string>> convertAvailable() override;
        std::shared_ptr<Promise<void>> closeSession() override;

    private:
        struct State_;
        std::shared_ptr<State_> state_;
    };
}
