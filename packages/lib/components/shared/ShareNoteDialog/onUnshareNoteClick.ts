import ShareService from '../../../services/share/ShareService';

interface UnshareNoteEvent {
	noteId: string;
}

const onUnshareNoteClick = async (event: UnshareNoteEvent) => {
	await ShareService.instance().unshareNote(event.noteId);
	await ShareService.instance().refreshShares();
};

export default onUnshareNoteClick;
