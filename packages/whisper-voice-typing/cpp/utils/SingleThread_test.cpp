#include "SingleThread_test.hpp"
#include "SingleThread.hpp"
#include "testing.hpp"
#include "androidUtil.h"

#include <string>
#include <vector>
#include <sstream>
#include <cmath>
#include <random>

void shouldConstructAndDestruct();
void shouldReturnSingleValue();
void shouldReturnMultipleAsync();
void shouldForwardExceptions();

void SingleThread_test() {
	LOGD("SingleThread: Starting tests...");
	shouldConstructAndDestruct();
	shouldReturnSingleValue();
    shouldReturnMultipleAsync();
	shouldForwardExceptions();
}

void shouldConstructAndDestruct() {
	{
		SingleThread thread {};
		LOGD("SingleThread: Constructed!");
	}
	LOGD("SingleThread: Destructed!");
	logTestPass("shouldConstructAndDestruct");
}

void shouldReturnSingleValue() {
	SingleThread thread {};

	LOGD("SingleThread: Posting a value and waiting!");

	assertEqual(thread.runAndWait<int>([] {
		LOGD("SingleThread: Inside thread!");
		return 3;
	}), 3, "should support returning a value from a lambda");
	LOGD("SingleThread: Posted a value and waited!");

	logTestPass("shouldReturnSingleValue");
}

void shouldReturnMultipleAsync() {
	SingleThread thread {};

	auto future1 = thread.run<int>([] {
		return 1;
	});
	auto future2 = thread.run<int>([] {
		return 2;
	});
	auto future3 = thread.run<int>([] {
		return 3;
	});

	assertEqual(future1.get(), 1, "getting future1");
	assertEqual(future3.get(), 3, "getting future3");
	assertEqual(future2.get(), 2, "getting future2");

	logTestPass("shouldReturnMultipleAsync");
}

void shouldForwardExceptions() {
	SingleThread thread {};

	bool caught = false;
	try {
		thread.runAndWait<void>([] {
			throw std::runtime_error("testing...");
		});
	} catch (std::runtime_error ex) {
		caught = true;
	}

	assertEqual(caught, true, "should have caught the exception");
	logTestPass("shouldForwardExceptions");
}
