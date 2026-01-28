
#include "HybridWhisperVoiceTyping.hpp"
#include "HybridWhisperSession.hpp"
#include "findLongestSilence_test.hpp"

using namespace margelo::nitro::whispervoicetyping;

std::shared_ptr<
    Promise<SessionPointer>
> HybridWhisperVoiceTyping::openSession(const SessionOptions& options) {
    std::string path = options.modelPath;
    std::string locale = options.locale;
    std::string prompt = options.prompt;
    bool shortAudioContext = options.shortAudioContext;

    return Promise<SessionPointer>::async([=] () -> SessionPointer {
        // Create a new SessionOptions to work around the lack of a copy constructor:
        auto options = SessionOptions { path, locale, prompt, shortAudioContext };
        return std::make_shared<HybridWhisperSession> (options);
    });
}

std::shared_ptr<Promise<void>> HybridWhisperVoiceTyping::test() {
    return Promise<void>::async([=] () -> void {
        findLongestSilence_test();
    });
}
