
// .setReact needs to be called very early in the application startup process.
// This file can be imported to ensure that .setReact has been called prior to
// all other import/requires.
import React from 'react';
import shim from '@joplin/lib/shim';
shim.setReact(React);
