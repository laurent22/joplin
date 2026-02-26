import { configureStore } from '@reduxjs/toolkit';
import exampleReducer from './features/exampleSlice';
import selectedNoteReducer from './features/selectedNoteSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      example: exampleReducer,
      selectedNote: selectedNoteReducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
// test
