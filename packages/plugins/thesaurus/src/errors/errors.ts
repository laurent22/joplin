// ProcessAlreadyRunningError exception
// Throws an exception only when the process is already in execution.
export class ProcessAlreadyRunningError extends Error {
	public constructor() {
		super('Python process is already running');
		this.name = 'ProcessAlreadyRunningError';
	}
}

// ProcessNotRunningError exception
// Throws an exception only when the process is not in execution.
export class ProcessNotRunningError extends Error {
	public constructor() {
		super('Python process is not running');
		this.name = 'ProcessNotRunningError';
	}
}

// ProcessStoppedError exception
// Throws an exception only when the process stopped during a pending response.
export class ProcessStoppedError extends Error {
	public constructor() {
		super('Python process was stopped while a response was pending');
		this.name = 'ProcessStoppedError';
	}
}

// PythonNlpError exception
// Throws an exception when an error happens with the Natural Language process.
export class PythonNlpError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'PythonNlpError';
	}
}
