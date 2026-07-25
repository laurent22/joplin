import { CallbackUrlCommand, getNoteCallbackUrl, parseCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import CommandService, { utils as commandUtils } from '@joplin/lib/services/CommandService';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { stateUtils } from '@joplin/lib/reducer';
import { AppState } from '../../app.reducer';
import bridge from '../../services/bridge';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('handleCallbackUrl');

// Opens the caller's x-success / x-error URL with the result appended as query params.
const respond = (target: string, params: Record<string, string> = {}) => {
	if (!target) return;
	const query = Object.entries(params)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
		.join('&');

	const fragmentIndex = target.indexOf('#');
	const base = fragmentIndex === -1 ? target : target.substring(0, fragmentIndex);
	const fragment = fragmentIndex === -1 ? '' : target.substring(fragmentIndex);
	const separator = base.includes('?') ? '&' : '?';
	const responseUrl = query ? `${base}${separator}${query}${fragment}` : target;
	void bridge().openExternal(responseUrl);
};

const handleGetCurrentNote = async (params: Record<string, string>) => {
	const state = commandUtils.store.getState() as AppState;
	const noteId = stateUtils.selectedNoteId(state);
	if (!noteId) {
		respond(params['x-error'], { errorMessage: 'No note is currently selected' });
		return;
	}

	const note = await Note.load(noteId);
	if (!note) {
		respond(params['x-error'], { errorMessage: 'The selected note could not be loaded' });
		return;
	}

	respond(params['x-success'], {
		title: note.title,
		url: getNoteCallbackUrl(note.id),
	});
};

const handleCreateNote = async (params: Record<string, string>) => {
	const folder = await Folder.getValidActiveFolder();
	if (!folder) {
		respond(params['x-error'], { errorMessage: 'No valid notebook is available to create the note in' });
		return;
	}

	// Not provisional: an externally-requested note should persist even if unedited.
	const note = await Note.save({
		...Note.previewFieldsWithDefaultValues({ includeTimestamps: false }),
		title: params.title ?? '',
		body: params.body ?? '',
		parent_id: folder.id,
	});

	commandUtils.store.dispatch({ type: 'NOTE_SELECT', id: note.id });

	respond(params['x-success'], {
		title: note.title,
		url: getNoteCallbackUrl(note.id),
	});
};

// Verbs dispatched directly to CommandService by name. Kept as an explicit
// allowlist (not a catch-all) so a crafted URL can't run arbitrary commands. See 69826610a.
const openCommands: string[] = [
	CallbackUrlCommand.OpenNote,
	CallbackUrlCommand.OpenFolder,
	CallbackUrlCommand.OpenTag,
];

const executeCallbackUrl = async (url: string) => {
	const info = parseCallbackUrl(url);

	if (info.command === CallbackUrlCommand.GetCurrentNote) {
		await handleGetCurrentNote(info.params);
		return;
	}

	if (info.command === CallbackUrlCommand.CreateNote) {
		await handleCreateNote(info.params);
		return;
	}

	if (openCommands.includes(info.command)) {
		await CommandService.instance().execute(info.command.toString(), info.params.id);
		logger.info(`Executed callback URL command: ${info.command}`);
		return;
	}

	throw new Error(`Unhandled callback URL command: ${info.command}`);
};

export default executeCallbackUrl;
