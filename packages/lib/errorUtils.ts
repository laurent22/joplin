/* eslint-disable import/prefer-default-export */

// This wraps an error message, allowing to set a prefix,
// while preserving all the important properties
// in particular the stack trace and original error message.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function wrapError(prefix: string, error: any) {
	if (!error) throw new Error('Unknown error');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const newError: any = new Error([prefix, error.message || ''].join(': '));

	if ('name' in error) newError.name = error.name;
	if ('fileName' in error) newError.fileName = error.fileName;
	if ('lineNumber' in error) newError.lineNumber = error.lineNumber;
	if ('columnNumber' in error) newError.columnNumber = error.columnNumber;

	// "code" is a non-standard property that is used in Joplin
	if ('code' in error) newError.code = error.code;

	// The stack is a string in this format:
	//
	// Error message
	// Stack line 1
	// Stack line 2
	// etc.
	//
	// And when console.error is used to print the error, it will take the message
	// from the stack (not from the "message" property), so it means we also need
	// to add the prefix error message to the stack.
	if ('stack' in error) newError.stack = [prefix, error.stack].join(': ');

	return newError;
}
