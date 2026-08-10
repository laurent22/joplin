import shim from '@joplin/lib/shim';

// .setReact needs to be called very early in the application startup process.
// This file can be imported to ensure that .setReact and .setReactDom have been called.
shim.setReact(require('react'));
shim.setReactDom(require('react-dom'));

