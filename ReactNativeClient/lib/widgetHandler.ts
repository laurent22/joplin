import RecentsWidget, { NoteItem } from './RecentsWidget';

const MAX_COUNT = 10;

export async function addNoteToRecentsWidget(note) {
  let recents: NoteItem[] = (await RecentsWidget.read()).notes || [];
  recents = recents.filter(recent => recent.id !== note.id).slice(0, MAX_COUNT);
  recents.unshift({
    id: note.id,
    title: note.title
  });
  return RecentsWidget.write({
    notes: recents
  });
}

export async function removeNoteFromRecentsWidget(noteId) {
  let recents: NoteItem[] = (await RecentsWidget.read()).notes || [];
  recents = recents.filter(recent => recent.id !== noteId);
  return RecentsWidget.write({
    notes: recents
  });
}
