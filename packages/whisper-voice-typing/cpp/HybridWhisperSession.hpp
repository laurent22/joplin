#pragma once

#include <mutex>
#include <memory>

#include "HybridWhisperSessionSpec.hpp"
#include "SessionOptions.hpp"
#include "utils/WhisperSession.hpp"

namespace margelo::nitro::whispervoicetyping {
    class HybridWhisperSession : public HybridWhisperSessionSpec {
    public:
        explicit HybridWhisperSession(const SessionOptions& options);

        void pushAudio(const std::shared_ptr<ArrayBuffer>& audio) override;
        std::shared_ptr<Promise<std::string>> convertNext() override;

    private:
        struct State_;
        std::shared_ptr<State_> state_;
    };
}
