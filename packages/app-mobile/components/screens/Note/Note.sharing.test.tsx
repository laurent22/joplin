import * as React from 'react';

import { afterEach, beforeEach, describe, it } from '@jest/globals';
import { LayoutChangeEvent, Share } from 'react-native';
import { Store } from 'redux';
import { basename, dirname } from 'path';

import { act, fireEvent, render, screen, userEvent, waitFor } from '../../../utils/testing/testingLibrary';
import NoteScreen from './Note';
import { encryptionService, runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import NoteLockService from '@joplin/lib/services/noteLock/NoteLockService';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import waitForWithRealTimers from '@joplin/lib/testing/waitFor';
import Note from '@joplin/lib/models/Note';
import { AppState } from '../../../utils/types';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import getWebViewDomById from '../../../utils/testing/getWebViewDomById';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import TestProviderStack from '../../testing/TestProviderStack';
import setupGlobalStore from '../../../utils/testing/setupGlobalStore';
import { DialogContext, DialogControl } from '../../DialogManager';
import useVisiblePluginEditorViewIds from '@joplin/lib/hooks/plugins/useVisiblePluginEditorViewIds';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { ExportModuleOutputFormat } from '@joplin/lib/services/interop/types';
import shareFile from '../../../utils/shareFile';

jest.mock('@joplin/lib/hooks/plugins/useVisiblePluginEditorViewIds', () => jest.fn((): string[] => []));
jest.mock('../../../utils/shareFile', () => jest.fn().mockResolvedValue(undefined));

const mockUseVisiblePluginEditorViewIds = useVisiblePluginEditorViewIds as jest.MockedFunction<typeof useVisiblePluginEditorViewIds>;

jest.retryTimes(2);

interface WrapperProps {
	dialogs?: DialogControl;
}

let store: Store<AppState>;

function deferred<T>() {
	let resolve: (value: T)=> void;
	const promise = new Promise<T>(resolvePromise => {
		resolve = resolvePromise;
	});
	return { promise, resolve: resolve! };
}

const mockNavigation = { state: { } };
const WrappedNoteScreen: React.FC<WrapperProps> = props => {
	return <TestProviderStack store={store}>
		<DialogContext.Provider value={props.dialogs ?? null}>
			<NoteScreen navigation={mockNavigation}/>
		</DialogContext.Provider>
	</TestProviderStack>;
};

const makeShareDialogs = (choice: 'plainText'|'html'|'cancel') => {
	const showMenu = jest.fn(async () => choice);
	return { dialogs: { showMenu } as unknown as DialogControl, showMenu };
};

const getNoteViewerDom = async () => {
	return await getWebViewDomById('NoteBodyViewer');
};

const waitForNoteToMatch = async (noteId: string, note: Partial<NoteEntity>) => {
	await act(() => waitForWithRealTimers(async () => {
		const loadedNote = await Note.load(noteId);
		expect(loadedNote).toMatchObject(note);
	}));
};

const openExistingNote = async (noteId: string) => {
	const note = await Note.load(noteId);
	const displayParentId = getDisplayParentId(note, await Folder.load(note.parent_id));

	store.dispatch({
		type: 'NOTE_UPDATE_ALL',
		notes: await Note.previews(displayParentId),
	});

	store.dispatch({
		type: 'FOLDER_AND_NOTE_SELECT',
		id: note.id,
		folderId: displayParentId,
	});
};

const openNewNote = async (noteProperties: NoteEntity) => {
	const note = await Note.save({
		parent_id: (await Folder.defaultFolder()).id,
		...noteProperties,
	});

	await openExistingNote(note.id);
	await waitForNoteToMatch(note.id, { parent_id: note.parent_id, title: note.title, body: note.body });

	return note.id;
};

const openNoteActionsMenu = async () => {
	// It doesn't seem possible to find the menu trigger with role/label.
	const actionMenuButton = await screen.findByTestId('screen-header-menu-trigger');

	// react-native-action-menu only shows the menu content after receiving onLayout
	// events from various components (including a View that wraps the screen).
	let cursor = actionMenuButton;
	while (cursor.parent) {
		if (cursor.props.onLayout) {
			const mockedEvent = { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 100 } } };
			cursor.props.onLayout(mockedEvent as LayoutChangeEvent);
		}
		cursor = cursor.parent;
	}

	// act() rather than waitFor(): waitFor rejects if the timer mode changes while it polls, and
	// draining the fake timers updates the menu drawer's state.
	await act(async () => {
		await runWithFakeTimers(async () => {
			await userEvent.press(actionMenuButton);
		});
	});

	// State can update until the menu content is marked as open (part of the
	// menu transition).
	await waitFor(async () => {
		expect(await screen.findByTestId('menu-content-open')).toBeVisible();
	});
};

const setupUnlockedNoteLock = async (password: string) => {
	Setting.setValue('featureFlag.noteLock', true);
	NoteLockService.destroyInstance();
	NoteLockSession.destroyInstance();
	NoteLockKey.destroyInstance();
	EncryptionService.instance_ = encryptionService();
	await NoteLockKey.instance().create(password);
	await NoteLockSession.instance().unlock(password);
};

describe('screens/Note/Note.sharing', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('editor.mobile.defaultEditState', 'view');

		store = createMockReduxStore();
		setupGlobalStore(store);

		// In order for note changes to be saved, note-screen-shared requires
		// that at least one folder exist.
		await Folder.save({ title: 'test', parent_id: '' });
		mockUseVisiblePluginEditorViewIds.mockReturnValue([]);
		jest.useRealTimers();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.mocked(shareFile).mockClear();
	});

	const openHtmlShareWithWarnings = async () => {
		await openNewNote({ title: 'Share warning', body: 'Body with missing content' });
		const { dialogs } = makeShareDialogs('html');
		const prompt = jest.fn((..._args: Parameters<DialogControl['prompt']>) => {});
		dialogs.prompt = prompt;
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockResolvedValue({ warnings: ['Missing resource'] });
		const removeFile = jest.spyOn(shim.fsDriver(), 'remove');
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.press(await screen.findByText('Share'));
		await waitFor(() => expect(prompt).toHaveBeenCalledWith(
			'',
			'Some content may be missing from the note. Do you still want to share it?',
			expect.arrayContaining([
				expect.objectContaining({ text: 'No', style: 'cancel' }),
				expect.objectContaining({ text: 'Yes' }),
			]),
			expect.objectContaining({ onDismiss: expect.any(Function) }),
		));
		expect(shareFile).not.toHaveBeenCalled();
		const [, , buttons, options] = prompt.mock.calls[0];
		const shareDir = dirname(exportHtml.mock.calls[0][0].path);
		return { buttons, options, removeFile, shareDir, unmount };
	};

	it('offers plain text and HTML, and does not share when cancelled', async () => {
		await openNewNote({ title: 'Share test', body: 'Short **body**' });
		const { dialogs, showMenu } = makeShareDialogs('cancel');
		const nativeShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockResolvedValue({ warnings: [] });
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.press(await screen.findByText('Share'));

		await waitFor(() => {
			expect(showMenu).toHaveBeenCalledWith('Choose an option', expect.arrayContaining([
				expect.objectContaining({ text: 'Plain text', id: 'plainText' }),
				expect.objectContaining({ text: 'HTML', id: 'html' }),
				expect.objectContaining({ text: 'Cancel', id: 'cancel' }),
			]));
		});
		await act(async () => {});
		expect(nativeShare).not.toHaveBeenCalled();
		expect(exportHtml).not.toHaveBeenCalled();
		expect(shareFile).not.toHaveBeenCalled();
		unmount();
	});

	it('shares a short note as plain text with a safe title', async () => {
		await openNewNote({ title: 'Short / note?', body: 'Short **body**' });
		const { dialogs } = makeShareDialogs('plainText');
		const nativeShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockResolvedValue({ warnings: [] });
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.press(await screen.findByText('Share'));

		await waitFor(() => {
			expect(nativeShare).toHaveBeenCalledWith({
				message: 'Short / note?\n\nShort **body**',
				title: 'Short _ note_',
			});
		});
		expect(exportHtml).not.toHaveBeenCalled();
		expect(shareFile).not.toHaveBeenCalled();
		unmount();
	});

	it('shares a long plain-text note with a safe note-title filename', async () => {
		await openNewNote({ title: 'Long / note?', body: 'x'.repeat(100001) });
		const { dialogs } = makeShareDialogs('plainText');
		const nativeShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
		const removeDir = jest.spyOn(shim.fsDriver(), 'remove');
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.press(await screen.findByText('Share'));

		await waitFor(() => expect(shareFile).toHaveBeenCalledWith(expect.any(String), 'text/plain'));
		const filePath = jest.mocked(shareFile).mock.calls[0][0];
		expect(basename(filePath)).toBe('Long _ note_.md');
		await waitFor(() => expect(removeDir).toHaveBeenCalledWith(dirname(filePath)));
		expect(removeDir).not.toHaveBeenCalledWith(filePath);
		expect(nativeShare).not.toHaveBeenCalled();
		unmount();
	});

	it('drains pending edits before exporting and sharing a short note as HTML', async () => {
		const noteId = await openNewNote({ title: 'Share test', body: 'Short **body**' });
		const { dialogs } = makeShareDialogs('html');
		const nativeShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockImplementation(async () => {
			expect(await Note.load(noteId)).toMatchObject({ title: 'Edited / title?', body: 'Short **body**' });
			return { warnings: [] };
		});
		const removeFile = jest.spyOn(shim.fsDriver(), 'remove');
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.changeText(await screen.findByDisplayValue('Share test'), 'Edited / title?');
		fireEvent.press(await screen.findByText('Share'));

		await waitFor(() => {
			expect(exportHtml).toHaveBeenCalledWith(expect.objectContaining({
				format: ExportModuleOutputFormat.Html,
				sourceNoteIds: [noteId],
				decryptLockedNotes: true,
			}));
			expect(shareFile).toHaveBeenCalledWith(expect.any(String), 'text/html');
		});
		const exportPath = exportHtml.mock.calls[0][0].path;
		expect(exportHtml.mock.calls[0][0]).not.toHaveProperty('plugins');
		expect(basename(exportPath)).toBe('Edited _ title_.html');
		await act(async () => {});
		expect(removeFile).not.toHaveBeenCalledWith(dirname(exportPath));
		expect(screen.queryByText('Exporting...')).toBeNull();
		expect(nativeShare).not.toHaveBeenCalled();
		unmount();
	});

	it('shows export progress and cancels HTML sharing', async () => {
		await openNewNote({ title: 'Slow export', body: 'A linked attachment' });
		const { dialogs } = makeShareDialogs('html');
		const exportFinished = deferred<void>();
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockImplementation(async () => {
			await exportFinished.promise;
			return { warnings: [] };
		});
		const removeFile = jest.spyOn(shim.fsDriver(), 'remove');
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.press(await screen.findByText('Share'));
		await waitFor(() => expect(exportHtml).toHaveBeenCalled());
		expect(await screen.findByText('Exporting...')).toBeVisible();

		fireEvent.press(await screen.findByText('Cancel'));
		await waitFor(() => expect(screen.queryByText('Exporting...')).toBeNull());
		expect(shareFile).not.toHaveBeenCalled();

		await act(async () => { exportFinished.resolve(undefined); });
		expect(shareFile).not.toHaveBeenCalled();
		await waitFor(() => expect(removeFile).toHaveBeenCalledWith(dirname(exportHtml.mock.calls[0][0].path)));
		unmount();
	});

	it('shares HTML after accepting export warnings', async () => {
		const { buttons, removeFile, shareDir, unmount } = await openHtmlShareWithWarnings();
		await act(async () => { buttons.find(button => button.text === 'Yes').onPress(); });
		await waitFor(() => expect(shareFile).toHaveBeenCalledWith(expect.any(String), 'text/html'));
		await act(async () => {});
		expect(removeFile).not.toHaveBeenCalledWith(shareDir);
		unmount();
	});

	it('does not share HTML when the note screen unmounts while export warnings are shown', async () => {
		const { buttons, removeFile, shareDir, unmount } = await openHtmlShareWithWarnings();
		unmount();
		await act(async () => { buttons.find(button => button.text === 'Yes').onPress(); });
		await waitFor(() => expect(removeFile).toHaveBeenCalledWith(shareDir));
		expect(shareFile).not.toHaveBeenCalled();
	});

	it('does not share HTML after declining export warnings', async () => {
		const { buttons, removeFile, shareDir, unmount } = await openHtmlShareWithWarnings();
		await act(async () => { buttons.find(button => button.text === 'No').onPress(); });
		await waitFor(() => expect(removeFile).toHaveBeenCalledWith(shareDir));
		expect(shareFile).not.toHaveBeenCalled();
		unmount();
	});

	it('does not share HTML when the export warning prompt is dismissed', async () => {
		const { options, removeFile, shareDir, unmount } = await openHtmlShareWithWarnings();
		await act(async () => { options.onDismiss(); });
		await waitFor(() => expect(removeFile).toHaveBeenCalledWith(shareDir));
		expect(shareFile).not.toHaveBeenCalled();
		unmount();
	});

	it('includes a conflict note when sharing it as HTML', async () => {
		const noteId = await openNewNote({ title: 'Conflict share', body: 'Conflict body', is_conflict: 1 });
		const { dialogs } = makeShareDialogs('html');
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockResolvedValue({ warnings: [] });
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);

		await openNoteActionsMenu();
		fireEvent.press(await screen.findByText('Share'));

		await waitFor(() => {
			expect(exportHtml).toHaveBeenCalledWith(expect.objectContaining({
				sourceNoteIds: [noteId],
				includeConflicts: true,
			}));
			expect(shareFile).toHaveBeenCalledWith(expect.any(String), 'text/html');
		});
		unmount();
	});

	it('shares decrypted HTML for a locked note', async () => {
		await setupUnlockedNoteLock('123456');
		const body = 'Secret **body**';
		const noteId = await openNewNote({ title: 'Locked share', body });
		const lockedNote = { ...await Note.load(noteId, { useNoteLock: true }), is_locked: 1, isDecrypted: true };
		await Note.save(lockedNote, { useNoteLock: true });
		store.dispatch({ type: 'SET_NOTE_LOCK_SESSION_UNLOCKED', value: true });
		expect((await Note.load(noteId)).body).not.toContain(body);

		const { dialogs } = makeShareDialogs('html');
		const exportHtml = jest.spyOn(InteropService.instance(), 'export').mockResolvedValue({ warnings: [] });
		const { unmount } = render(<WrappedNoteScreen dialogs={dialogs}/>);
		try {
			await getNoteViewerDom();
			await openNoteActionsMenu();
			fireEvent.press(await screen.findByText('Share'));

			await waitFor(() => {
				expect(exportHtml).toHaveBeenCalledWith(expect.objectContaining({
					sourceNoteIds: [noteId],
					decryptLockedNotes: true,
				}));
				expect(shareFile).toHaveBeenCalledWith(expect.any(String), 'text/html');
			});
		} finally {
			unmount();
			Setting.setValue('featureFlag.noteLock', false);
		}
	});
});
