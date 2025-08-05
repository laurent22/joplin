# Debugging performance issues

## Using the profiler

The developer tools for the desktop and web apps include a ["Performance"](https://developer.chrome.com/docs/devtools/performance) tab. It can be useful for debugging startup and runtime performance. To use it:
1. Open the developer tools window.
2. Click on the "Performance" tab.

**Profiling application startup**: To record performance information during app startup, click the "Record and reload" button. After the application finishes reloading, a chart with sections for different tasks (e.g. "Main", "Animations", "Timings") should be shown. The "Timings" section should include marks and tasks logged with `PerformanceLogger`.

For React Native, see:
- [Profiling on Android](https://reactnative.dev/docs/profiling)
- [Information about the React Profiler](https://reactnative.dev/docs/react-native-devtools#react-profiler).

## Performance logging

The `PerformanceLogger` class has a few methods that can help debug performance issues:
- `.mark(name)`: Adds a performance mark with a timestamp. For tasks with duration, prefer `.track` or `.taskStart`.
- `.track(name, task)`: Logs information about how long it takes the async `task` to complete.
- `.taskStart(name)`: Marks the start of a task with some `name`.

### Naming conventions

The `name` provided to `.mark`, `.track`, and `.taskStart` should have the form `filename/marker name`. For example, in `root.tsx`, a performance task might be named `root/application setup`.

These names should be unique inline string literals so that they can be quickly found with a global search.

### Finding performance markers

Performance marks can be found by searching for `Performance:` in Joplin's logs. Be aware that more information is logged in development mode (or with debug logging enabled) than in release mode. In particular:
- **.mark**: Performance `.mark`s are logged with level `info`.
- **.taskStart**: The start of tasks logged with `.track` or `.taskStart` are logged with `debug`.
- **.onEnd**: Information about the end of tasks are logged with `info` **if** the task takes longer than 0.1s. Otherwise, the information is logged with level `debug`.

On desktop and web (in Chrome), `PerformanceLogger` tasks and marks are added to the "Timings" tab of the performance timeline (see ["Using the profiler"](#using-the-profiler)). 

**Note**: To allow profiling startup code that runs before the main `Logger` is initialized, `PerformanceLogger` buffers log output until `PerformanceLogger.setLogger` is called (usually done during the application startup process). At this point, all buffered messages are logged. 

### Example

```ts
const perfLogger = PerformanceLogger.create();

class VerySlowThing {
	public doSomethingSlow() {
		// It's possible to mark the start and end of tasks with .taskStart and .onEnd:
		const task = perfLogger.taskStart('VerySlowThing/doSomethingSlow');

		// This will take some time to complete:
		for (let i = 0; i < 10_000_000; i++) {
			i -= Math.random() * 1.9;

			if (i >= 100_000) {
				perfLogger.mark('VerySlowThing/Counter has reached 100_000');
			}
		}

		task.onEnd();
	}

	public async doSomethingElse() {
		// .track wraps an async callback.
		await perfLogger.track('VerySlowThing/doSomethingElse', async () => {
			await someBackgroundTask();

			// Even if the callback throws an Error, .track
			// ends the task in the log file.
			throw new Error('An error!');
		});
	}
}
```
