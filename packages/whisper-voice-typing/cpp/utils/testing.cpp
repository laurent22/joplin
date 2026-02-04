#include "testing.hpp"

void fail(const std::string& message) {
	throw std::runtime_error(message);
}

void logTestPass(const std::string& message) {
	LOGI("Test PASS: %s", message.c_str());
}
