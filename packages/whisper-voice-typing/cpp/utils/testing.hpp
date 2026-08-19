#pragma once

#include <string>
#include <sstream>
#include "androidUtil.h"

// Test-related utilities

void fail(const std::string& message);

void logTestPass(const std::string& message);

template<typename T>
void assertEqual(const T& a, const T& b, const std::string& message) {
	if (a != b) {
		std::stringstream fullMessage;
		fullMessage << "Not equal:" << a << " != " << b << " (" << message << ")";
		fail(fullMessage.str());
	}
}
