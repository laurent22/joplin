import { CallbackUrlCommand, getNoteCallbackUrl, parseCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import CommandService, { utils as commandUtils } from '@joplin/lib/services/CommandService';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { stateUtils } from '@joplin/lib/reducer';
import { AppState } from '../../app.reducer';
import bridge from '../../services/bridge';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('handleCallbackUrl');

// Schemes of known apps, which are allowed whatever their callback format. Add
// any legitimate app here - it's preferred over relying on the host check below.
// From https://x-callback-url.com/apps/ and https://app-talk.com/
const knownCallbackProtocols = [
	'agenda:', 'airmail:', 'bear:', 'beorg:', 'byword:', 'calca:', 'copied:',
	'dayone:', 'devonthink:', 'drafts:', 'drafts5:', 'due:', 'editorial:',
	'fantastical2:', 'gladys:', 'hook:', 'instapaper:', 'launcher:', 'omnifocus:',
	'omnifocus3:', 'onewriter:', 'opener:', 'outlinely:', 'overcast:', 'prizmo:',
	'pyto:', 'scriptable:', 'shortcutsiosopen:', 'terminology:', 'textastic:',
	'things:', 'timepage:', 'todoist:', 'trello:', 'twodo:', 'ulysses:',
	'working-copy:', 'x-devonthink:',
];

const respond = (target: string, params: Record<string, string> = {}) => {
	if (!target) return;

	// A joplin:// URL can be triggered from a web page and the target is passed to
	// the OS URI dispatcher, so it must not reach an arbitrary handler.
	let url;
	try {
		url = new URL(target);
	} catch (error) {
		// The target is untrusted and may contain secrets, so don't log it.
		logger.warn('Rejected malformed callback target');
		return;
	}
	if (url.host !== 'x-callback-url' && !knownCallbackProtocols.includes(url.protocol)) {
		logger.warn(`Rejected callback target with host "${url.host}" and scheme "${url.protocol}"`);
		return;
	}

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

	if (!openCommands.includes(info.command) &&
		info.command !== CallbackUrlCommand.GetCurrentNote &&
		info.command !== CallbackUrlCommand.CreateNote) {
		throw new Error(`Unhandled callback URL command: ${info.command}`);
	}

	try {
		if (info.command === CallbackUrlCommand.GetCurrentNote) {
			await handleGetCurrentNote(info.params);
		} else if (info.command === CallbackUrlCommand.CreateNote) {
			await handleCreateNote(info.params);
		} else {
			await CommandService.instance().execute(info.command.toString(), info.params.id);
			logger.info(`Executed callback URL command: ${info.command}`);
		}
	} catch (error) {
		logger.error(`Error handling callback URL command "${info.command}":`, error);
		// Return an opaque status rather than error.message, which can leak
		// profile paths and item ids to the caller-supplied x-error target.
		respond(info.params['x-error'], { errorMessage: 'The command could not be completed' });
	}
};

export default executeCallbackUrl;
