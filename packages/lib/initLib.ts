
// @joplin/lib has its own copy of the Logger class, however we want it to be
// initialised with the same logger instance as the calling application, so that
// the lib and app share the same log. This initLib() function is used for this
// and must be called by any "app" package that makes use of the lib package.
import Logger from '@joplin/utils/Logger';
export default (globalLogger: Logger) => {
	Logger.initializeGlobalLogger(globalLogger);
};
