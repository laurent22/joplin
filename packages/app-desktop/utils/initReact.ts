
// .setReact needs to be called very early in the application startup process.
// This file can be imported to ensure that .setReact and .setReactDom have been called.
import react_91 from 'react';
import react_dom_92 from 'react-dom';
import shim from '@joplin/lib/shim';
shim.setReact(react_91);
shim.setReactDom(react_dom_92);

