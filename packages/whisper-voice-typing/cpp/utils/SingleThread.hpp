#pragma once

#include <thread>
#include <functional>
#include <future>

// Reserves a single thread. Similar to Java/Android's "Handler"
class SingleThread {
public:
	SingleThread();
	// Waits for all pending tasks to complete before destruction
	~SingleThread();

	// Run the `task` on the thread and return a future that will resolve to the result
	template <typename T>
	std::future<T> run(std::function<T()> task) {
		auto promise = std::make_shared<std::promise<T>>();
		post([promise = promise, task = std::move(task)] {
			try {
                T result = task();
				promise->set_value(result);
			} catch (...) {
                // Use current_exception to create an exception pointer.
                // See https://en.cppreference.com/w/cpp/thread/promise/set_exception
				promise->set_exception(std::current_exception());
			}
		});
		return promise->get_future();
	}

    // Explicit definition of run<void> to work around templating issues:
	std::future<void> run(std::function<void()> task) {
        auto promise = std::make_shared<std::promise<void>>();
		post([promise = promise, task = std::move(task)] {
			try {
                task();
				promise->set_value();
			} catch (...) {
				promise->set_exception(std::current_exception());
			}
		});
		return promise->get_future();
    }

	// Run the `task` on the thread and wait for it to complete
	template <typename T>
	T runAndWait(std::function<T()> task) {
		return run(task).get();
	}

	struct State_;
private:
	// Asynchronously runs the given `task` on the thread
	void post(std::function<void()> task);

private:
	std::shared_ptr<State_> state_;

	std::thread thread_;
};

