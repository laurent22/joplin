// Note about the application structure:
// - The user interface and its state is managed by React/Redux.
// - Persistent storage to SQLite and Web API is handled outside of React/Redux using regular JavaScript (no middleware, no thunk, etc.).
// - Communication from React to SQLite is done by calling model methods (note.save, etc.)
// - Communication from SQLite to Redux is done via dispatcher.

// So there's basically still a one way flux: React => SQLite => Redux => React

import './utils/initReact';
import './utils/polyfills';

import Root from './root';
import { registerRootComponent } from 'expo';
// Allows loading image assets. See https://github.com/expo/expo/issues/31240
import 'expo-asset';

registerRootComponent(() => <Root/>);

// Using streams on react-native requires to polyfill process.nextTick()
global.process.nextTick = setImmediate;
