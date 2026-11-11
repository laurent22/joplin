// Unlike joplin-empty-package, this throws so that optional dependency checks such as
// jsdom's `try { require('canvas') }` treat the package as not installed.
const error = new Error('Cannot find module (excluded via joplin-missing-package)');
error.code = 'MODULE_NOT_FOUND';
throw error;
