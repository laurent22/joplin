// Tests for ShortcutRecorder — regression coverage for:
// Issue #11670: "Shortcut editor: Can't save changes if there are existing shortcut conflicts"
// https://github.com/laurent22/joplin/issues/11670

import * as React from 'react';
import { render, screen, act } from '@testing-library/react';

// ── Mock Electron-dependent modules that cannot load in jsdom ─────────────────

// styles/index.ts calls buildStyle which needs a running theme engine.
// Provide a stub function that returns empty style objects.
jest.mock('./styles/index', () => ({
	__esModule: true,
	default: () => ({
		recorderContainer: {},
		inlineButton: {},
	}),
}));

jest.mock('../../services/bridge', () => ({
	__esModule: true,
	default: () => ({ showErrorMessageBox: jest.fn() }),
}));

// ── Real imports after mocks ──────────────────────────────────────────────────

import { ShortcutRecorder } from './ShortcutRecorder';
import KeymapService from '@joplin/lib/services/KeymapService';

// ── Shared singleton reference ────────────────────────────────────────────────
// IMPORTANT: ShortcutRecorder.tsx also captures `KeymapService.instance()` at
// module scope. Calling destroyInstance() would create a new singleton that the
// component can't see. Instead we reuse the same instance and reset it between tests.
const keymapService = KeymapService.instance();

// ── Test helpers ─────────────────────────────────────────────────────────────

function renderRecorder(commandName: string, initialAccelerator: string) {
	const onSave = jest.fn();
	const onReset = jest.fn();
	const onCancel = jest.fn();
	const onError = jest.fn();

	render(
		<ShortcutRecorder
			onSave={onSave}
			onReset={onReset}
			onCancel={onCancel}
			onError={onError}
			initialAccelerator={initialAccelerator}
			commandName={commandName}
			themeId={1}
		/>,
	);

	return { onSave, onReset, onCancel, onError };
}

function isSaveDisabled(): boolean {
	const btn = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
	return btn.disabled;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ShortcutRecorder — Save button state', () => {
	beforeAll(() => {
		// Initialise once with the 'default' (non-darwin) platform so that
		// accelerator strings like 'Ctrl+0' are valid on all CI platforms.
		keymapService.initialize([], 'default');
	});

	beforeEach(() => {
		// Reset the keymap to default values to discard state left by the
		// previous test (e.g. plugin-registered commands added during the test).
		keymapService.resetKeymap();
	});

	// ── Issue #11670 regression ───────────────────────────────────────────

	it('keeps Save enabled when the initial accelerator conflicts with a plugin-registered command', async () => {
		// Simulate the exact scenario from issue #11670:
		// A plugin registers 'myPluginCommand' with 'Ctrl+0', but 'Ctrl+0' is
		// already the default accelerator for 'zoomActualSize'. This creates
		// a pre-existing collision in the in-memory keymap.
		keymapService.registerCommandAccelerator('myPluginCommand', 'Ctrl+0');

		// Open the editor for a completely different command ('newNote', 'Ctrl+N').
		await act(async () => {
			renderRecorder('newNote', 'Ctrl+N');
		});

		// Before the fix: validateKeymap() stumbled on the Ctrl+0 collision and
		// set saveAllowed=false even though the current row has no conflict.
		// After the fix: conflicts in OTHER commands are warnings, not blockers.
		expect(isSaveDisabled()).toBe(false);
	});

	it('keeps Save enabled when the recorder is opened for a command directly involved in a conflict', async () => {
		// The command being edited (zoomActualSize) is part of the collision —
		// its own accelerator 'Ctrl+0' is duplicated by the plugin command.
		keymapService.registerCommandAccelerator('myPluginCommand', 'Ctrl+0');

		await act(async () => {
			renderRecorder('zoomActualSize', 'Ctrl+0');
		});

		// Conflict warning shows, but Save must remain active.
		expect(isSaveDisabled()).toBe(false);
	});

	it('calls onError with a non-null Error for a conflict but does not disable Save', async () => {
		keymapService.registerCommandAccelerator('myPluginCommand', 'Ctrl+0');

		const { onError } = await act(async () => renderRecorder('zoomActualSize', 'Ctrl+0'));

		// The warning triangle must surface via onError...
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({ recorderError: expect.any(Error) }),
		);

		// ...but Save stays enabled.
		expect(isSaveDisabled()).toBe(false);
	});

	// ── Structural errors — save must be blocked ──────────────────────────

	it('disables Save when the accelerator string is structurally invalid', async () => {
		// 'Ctrl+0+Z' has two non-modifier keys — malformed.
		await act(async () => {
			renderRecorder('newNote', 'Ctrl+0+Z');
		});

		expect(isSaveDisabled()).toBe(true);
	});

	// ── Empty accelerator — disabling a shortcut ──────────────────────────

	it('keeps Save enabled when the accelerator is empty (disabling a shortcut)', async () => {
		await act(async () => {
			renderRecorder('newNote', '');
		});

		expect(isSaveDisabled()).toBe(false);
	});

	// ── Happy path — valid accelerator, no conflicts ──────────────────────

	it('keeps Save enabled for a valid accelerator with no conflicts', async () => {
		await act(async () => {
			// 'Ctrl+8' is not in any default keymap entry.
			renderRecorder('newNote', 'Ctrl+8');
		});

		expect(isSaveDisabled()).toBe(false);
	});
});
