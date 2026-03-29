#include "SingleThread.hpp"
#include "androidUtil.h"

#include <condition_variable>
#include <thread>
#include <mutex>

struct SingleThread::State_ {
	std::vector<std::function<void()>> tasks;

	// mutex_ and cv_ are used as a signaling mechanism.
	// See, for example https://cplusplus.com/reference/condition_variable/condition_variable/
	//                  https://en.cppreference.com/w/cpp/thread/condition_variable.html
	std::condition_variable cv;
    std::mutex mutex;

	bool cancelled = false;
};

void threadLoop(std::shared_ptr<SingleThread::State_> state) {
	while (!state->cancelled) {
		// Create a lock that can be used by state->cv (see https://stackoverflow.com/a/13102893
        // for why).
		std::unique_lock lock {state->mutex};

        // Run all tasks **first**, to handle the case where the threadLoop starts after the first
        // task has been posted.
		for (auto& task : state->tasks) {
			task();
		}
		state->tasks.clear();

		state->cv.wait(lock);
	}
}

SingleThread::SingleThread()
	: state_ { std::make_shared<State_>() },
	  thread_ { threadLoop, state_ } {
}

SingleThread::~SingleThread() {
	{
		std::lock_guard lock { state_->mutex };
		state_->cancelled = true;
	}

	state_->cv.notify_all();
	thread_.join();
}

void SingleThread::post(std::function<void()> task) {
	{
		std::lock_guard lock { state_->mutex };
		state_->tasks.push_back(std::move(task));
	}
	state_->cv.notify_all();
}

