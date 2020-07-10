require('app-module-path').addPath(__dirname);

const { shim } = require('lib/shim');
const KeymapService = require('lib/services/KeymapService.js');
const keymapService = KeymapService.instance();

describe('services_KeymapService', () => {
	describe('isAccelerator', () => {
		it('should identify valid Accelerators', () => {
			const testCases = shim.isMac()
				? [
					'F4',
					'Cmd+F9',
					'Option+Z',
					'Option+Shift+F',
					'Ctrl+Option+U',
					'Option+Shift+Cmd+F9',
					'Ctrl+Shift+Z',
					'Option+Shift+Cmd+B',
				] : [
					'F4',
					'Ctrl+F9',
					'Alt+Shift+F',
					'Shift+U',
					'Ctrl+Shift+T',
					'Ctrl+Alt+Shift+Z',
					'Alt+E',
					'Alt+Shift+F9',
				];

			testCases.forEach(accelerator => expect(KeymapService.isAccelerator(accelerator)).toBeTruthy());
		});

		it('should identify invalid Accelerators', () => {
			const testCases = shim.isMac()
				? [
					'',
					'A+Z',
					'Cmd',
					'Ctrl+',
					'Option+Cmd',
					'Ctrl+Shift',
					'Cmd+H+A',
					'Option+Shift+Cmd+J+O+P',
					'Opptionn+F9',
					'Ctrl+Shiftt+X',
					'Cmd+Option+Shoft+T',
				] : [
					'+',
					'B+F4',
					'Ctrl+',
					'Ctrl+Shift+',
					'Cmd+Alt',
					'Ctrl+Shift+Alt',
					'Cmd+H+A',
					'Ctrl+Shift+Alt+J+O+P',
					'Contrl+F9',
					'Controller+Shift+X',
					'Cmd+Option+Shoft+T',
				];

			testCases.forEach(accelerator => expect(KeymapService.isAccelerator(accelerator)).not.toBeTruthy());
		});
	});

	describe('getAccelerator', () => {
		beforeEach(() => keymapService.resetKeymap());

		it('should return the platform-specific default Accelerator', () => {
			expect(keymapService.getAccelerator('newNoteItem')).toEqual(shim.isMac() ? 'Cmd+N' : 'Ctrl+N');
			expect(keymapService.getAccelerator('synchronize')).toEqual(shim.isMac() ? 'Cmd+S' : 'Ctrl+S');
			expect(keymapService.getAccelerator('selectAll')).toEqual(shim.isMac() ? 'Cmd+A' : 'Ctrl+A');
			expect(keymapService.getAccelerator('textBold')).toEqual(shim.isMac() ? 'Cmd+B' : 'Ctrl+B');
		});

		if ('should throw when an invalid command is requested', () => {
			expect(() => keymapService.getAccelerator('totallyNonExistentCommand')).toThrow();
		});
	});

	describe('setAccelerator', () => {
		beforeEach(() => keymapService.resetKeymap());

		it('should update the Accelerator', () => {
			const testCases = shim.isMac()
				? [
					{ command: 'newNoteItem', accelerator: 'Ctrl+Option+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'showLocalSearch', accelerator: 'Option+Cmd+S' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'print', accelerator: null /* Disabled */ },
					{ command: 'focusElementNoteTitle', accelerator: 'Option+Shift+Cmd+T' },
					{ command: 'focusElementNoteBody', accelerator: 'Ctrl+Option+Shift+Cmd+B' },
				] : [
					{ command: 'newNote', accelerator: 'Ctrl+Alt+Shift+N' },
					{ command: 'synchronize', accelerator: 'F15' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' }, /* Mixed with shorthand */
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },  /* Mixed with shorthand */
					{ command: 'print', accelerator: null /* Disabled */ },
					{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Alt+Shift+T' },
					{ command: 'focusElementNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
				];

			testCases.forEach(({ command, accelerator }) => {
				const _accelerator = keymapService.getAccelerator(command); // default Accelerator
				keymapService.setAccelerator(command, accelerator);

				expect(keymapService.getAccelerator(command)).toEqual(accelerator);
				// This test will fail if test cases are setting Accelerators to their default values
				expect(keymapService.getAccelerator(command)).not.toEqual(_accelerator);
			});
		});
	});

	describe('resetAccelerator', () => {
		beforeEach(() => keymapService.resetKeymap());

		it('should reset the Accelerator', () => {
			const testCases = [
				{ command: 'newNote', accelerator: 'Ctrl+Alt+Shift+N' },
				{ command: 'synchronize', accelerator: null /* Disabled */ },
				{ command: 'textBold', accelerator: 'Shift+F5' },
				{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
				{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
				{ command: 'print', accelerator: 'Alt+P' },
				{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Alt+Shift+T' },
				{ command: 'focusElementNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
			];

			testCases.forEach(({ command, accelerator }) => {
				// Remember the default Accelerator value
				const _accelerator = keymapService.getAccelerator(command);

				// Update the Accelerator,
				keymapService.setAccelerator(command, accelerator);
				expect(keymapService.getAccelerator(command)).toEqual(accelerator);

				// and then reset it..
				keymapService.resetAccelerator(command);
				expect(keymapService.getAccelerator(command)).toEqual(_accelerator);
			});
		});
	});

	describe('getKeymap', () => {
		beforeEach(() => keymapService.resetKeymap());

		it('should return the updated keymap after setting the custom keymap', () => {
			const customKeymap = shim.isMac()
				? [
					{ command: 'newNoteItem', accelerator: 'Ctrl+Option+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'focusNoteTitle', accelerator: 'Option+Shift+Cmd+T' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Option+S' },
					{ command: 'gotoAnything', accelerator: 'Shift+Cmd+G' },
					{ command: 'focusSidebar', accelerator: null /* Disabled */ },
					{ command: 'printItem', accelerator: 'Option+P' },
					{ command: 'focusNoteBody', accelerator: 'Ctrl+Option+Shift+Cmd+B' },
				] : [
					{ command: 'newNoteItem', accelerator: 'Ctrl+Alt+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'focusNoteTitle', accelerator: 'Ctrl+Alt+Shift+T' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'focusSidebar', accelerator: null /* Disabled */ },
					{ command: 'printItem', accelerator: 'Alt+P' },
					{ command: 'focusNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
				];

			expect(() => keymapService.setKeymap(customKeymap)).not.toThrow();

			// Sort both of the lists so that the difference in order won't fail the test
			expect(keymapService.getKeymap().sort((a, b) => a.command.localeCompare(b.command)))
				.toEqual(customKeymap.sort((a, b) => a.command.localeCompare(b.command)));
		});

		it('should return the updated keymap after setting individual Accelerator', () => {
			const customKeymap = shim.isMac()
				? [
					{ command: 'gotoAnything', accelerator: 'Shift+Cmd+G' },
					{ command: 'newNoteItem', accelerator: 'Ctrl+Option+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'focusSidebar', accelerator: null /* Disabled */ },
					{ command: 'focusNoteTitle', accelerator: 'Option+Shift+Cmd+T' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Option+S' },
					{ command: 'printItem', accelerator: 'Option+P' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'focusNoteBody', accelerator: 'Option+Cmd+B' },
				] : [
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'newNoteItem', accelerator: 'Ctrl+Alt+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'focusSidebar', accelerator: null /* Disabled */ },
					{ command: 'focusNoteTitle', accelerator: 'Ctrl+Alt+Shift+T' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'printItem', accelerator: 'Alt+P' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'focusNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
				];

			customKeymap.forEach(({ command, accelerator }) => keymapService.setAccelerator(command, accelerator));

			// Sort both of the lists so that the difference in order won't fail the test
			expect(keymapService.getKeymap().sort((a, b) => a.command.localeCompare(b.command)))
				.toEqual(customKeymap.sort((a, b) => a.command.localeCompare(b.command)));
		});

		it('should return the updated keymap after setting some Accelerators to null', () => {
			// NOTE: Set "accelerator" property to null in order to disable a shortcut
			const customKeymap = shim.isMac()
				? [
					{ command: 'gotoAnything', accelerator: 'Shift+Cmd++G' },
					{ command: 'newNoteItem', accelerator: 'Option+Shift+Cmd+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'focusNoteTitle', accelerator: null },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Option+S' },
					{ command: 'printItem', accelerator: 'Option+P' },
					{ command: 'textBold', accelerator: null },
					{ command: 'focusNoteBody', accelerator: 'Option+Shift+Cmd+B' },
				] : [
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'newNoteItem', accelerator: 'Ctrl+Alt+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'focusNoteTitle', accelerator: null },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'printItem', accelerator: 'Alt+P' },
					{ command: 'textBold', accelerator: null },
					{ command: 'focusNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
				];

			customKeymap.forEach(({ command, accelerator }) => keymapService.setAccelerator(command, accelerator));

			// Sort both of the lists so that the deference in order won't fail the test
			expect(keymapService.getKeymap().sort((a, b) => a.command.localeCompare(b.command)))
				.toEqual(customKeymap.sort((a, b) => a.command.localeCompare(b.command)));
		});
	});

	describe('setKeymap', () => {
		beforeEach(() => keymapService.resetKeymap());

		it('should update the keymap', () => {
			const customKeymap = shim.isMac()
				? [
					{ command: 'newNote', accelerator: 'Option+Shift+Cmd+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Option+S' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'print', accelerator: 'Option+P' },
					{ command: 'help', accelerator: null /* Disabled */ },
					{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Option+Shift+T' },
					{ command: 'focusElementNoteBody', accelerator: 'Option+Shift+Cmd+B' },
					{ command: 'focusElementSideBar', accelerator: 'Shift+Cmd+L' /* Default of focusElementNoteList */ },
					{ command: 'focusElementNoteList', accelerator: 'Shift+Cmd+S' /* Default of focusElementSideBar */ },
				] : [
					{ command: 'newNote', accelerator: 'Ctrl+Alt+Shift+N' },
					{ command: 'synchronize', accelerator: 'F11' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'print', accelerator: 'Alt+P' },
					{ command: 'help', accelerator: null /* Disabled */ },
					{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Alt+Shift+T' },
					{ command: 'focusElementNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
					{ command: 'focusElementSideBar', accelerator: 'Ctrl+Shift+L' /* Default of focusElementNoteList */ },
					{ command: 'focusElementNoteList', accelerator: 'Ctrl+Shift+S' /* Default of focusElementSideBar */ },
				];

			expect(() => keymapService.setKeymap(customKeymap)).not.toThrow();

			customKeymap.forEach(({ command, accelerator }) => {
				// Also check if keymap is updated or not
				expect(keymapService.getAccelerator(command)).toEqual(accelerator);
			});
		});

		it('should throw when the required properties are missing', () => {
			const customKeymaps = [
				[
					{ commmmmand: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'print', accelerator: 'Alt+P' },
				],
				[
					{ accelerator: 'Alt+P' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
				],
				[
					{ command: 'showLocalSearch', accel: 'Ctrl+Alt+S' },
					{ command: 'print', accelerator: 'Alt+P' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
				],
				[
					{ command: 'print' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
				],
			];

			for (let i = 0; i < customKeymaps.length; i++) {
				const customKeymap = customKeymaps[i];
				expect(() => keymapService.setKeymap(customKeymap)).toThrow();
			}
		});

		it('should throw when the provided Accelerators are invalid', () => {
			// Only one test case is provided since KeymapService.isAccelerator() is already tested
			const customKeymap = [
				{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
				{ command: 'print', accelerator: 'Alt+P' },
				{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Alt+Shift+J+O+P+L+I+N' },
			];

			expect(() => keymapService.setKeymap(customKeymap)).toThrow();
		});

		it('should throw when the provided commands are invalid', () => {
			const customKeymap = [
				{ command: 'totallyInvalidCommand', accelerator: 'Ctrl+Shift+G' },
				{ command: 'print', accelerator: 'Alt+P' },
				{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Alt+Shift+J' },
			];

			expect(() => keymapService.setKeymap(customKeymap)).toThrow();
		});

		it('should throw when duplicate accelerators are provided', () => {
			const customKeymaps = shim.isMac()
				? [
					[
						{ command: 'showLocalSearch', accelerator: 'Option+Cmd+S' /* Duplicate */ },
						{ command: 'gotoAnything', accelerator: 'Option+Cmd+S' /* Duplicate */ },
						{ command: 'print', accelerator: 'Option+P' },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'Option+Cmd+S' },
						{ command: 'print', accelerator: 'Cmd+G' /* Default of gotoAnything */ },
						{ command: 'focusElementNoteTitle', accelerator: 'Option+Shift+Cmd+J' },
					],
				] : [
					[
						{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' /* Duplicate */ },
						{ command: 'print', accelerator: 'Alt+P' },
						{ command: 'gotoAnything', accelerator: 'Ctrl+Alt+S' /* Duplicate */ },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
						{ command: 'print', accelerator: 'Ctrl+G' /* Default of gotoAnything */ },
						{ command: 'focusElementNoteTitle', accelerator: 'Ctrl+Alt+Shift+J' },
					],
				];

			for (let i = 0; i < customKeymaps.length; i++) {
				const customKeymap = customKeymaps[i];

				// Save keymap defaults
				const defaultAccelerators = customKeymap.map(({ command }) => keymapService.getAccelerator(command));

				expect(() => keymapService.setKeymap(customKeymap)).toThrow();
				// All items should be reset to default values
				for (let j = 0; j < customKeymap.length; j++) {
					expect(keymapService.getAccelerator(customKeymap[j].command)).toEqual(defaultAccelerators[j]);
					// This test will fail if trying to set Accelerator to its already default value
					expect(keymapService.getAccelerator(customKeymap[j].command)).not.toEqual(customKeymap[j].accelerator);
				}
			}
		});
	});
});
