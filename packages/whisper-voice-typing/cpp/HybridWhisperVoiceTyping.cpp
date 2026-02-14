#include <memory>

#include "HybridWhisperVoiceTyping.hpp"
#include "HybridWhisperSession.hpp"
#include "findLongestSilence_test.hpp"
#include "SingleThread_test.hpp"


using namespace margelo::nitro::whispervoicetyping;

SessionPointer HybridWhisperVoiceTyping::openSession(const SessionOptions& options) {
    return std::make_shared<HybridWhisperSession> (options);
}

std::shared_ptr<Promise<void>> HybridWhisperVoiceTyping::test() {
    return Promise<void>::async([=] () -> void {
        findLongestSilence_test();
        SingleThread_test();
    });
}
