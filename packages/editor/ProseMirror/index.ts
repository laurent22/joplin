// This index.ts file helps prevent code duplication issues when bundling
// as it allows ESBuild to select the TypeScript version of createEditor.

import '../polyfills';
// eslint-disable-next-line import/prefer-default-export
export { default as createEditor } from './createEditor';
