import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NoteEntity } from '@/lib/database';

interface SelectedNoteState {
  note: NoteEntity | null;
}

const initialState: SelectedNoteState = {
  note: null,
};

export const selectedNoteSlice = createSlice({
  name: 'selectedNote',
  initialState,
  reducers: {
    setSelectedNote: (state, action: PayloadAction<NoteEntity>) => {
      state.note = action.payload;
    },
    clearSelectedNote: (state) => {
      state.note = null;
    },
  },
});

export const { setSelectedNote, clearSelectedNote } = selectedNoteSlice.actions;

export default selectedNoteSlice.reducer;
