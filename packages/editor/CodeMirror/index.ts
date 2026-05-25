// This index.ts file helps prevent code duplication issues when bundling
// as it allows ESBuild to select the TypeScript version of createEditor.

// eslint-disable-next-line import/prefer-default-export
import '../polyfills';
export { default as createEditor } from './createEditor';
