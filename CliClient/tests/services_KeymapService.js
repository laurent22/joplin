require('app-module-path').addPath(__dirname);

const KeymapService = require('lib/services/KeymapService.js');
const { shim } = require('lib/shim');

const keymapService = KeymapService.instance();

describe('services_KeymapService', () => {
	describe('isAccelerator', () => {
		it('should identify valid Accelerators', () => {
			const testCases = [
				'F8',
				'Alt+Shift+F',
				'Shift+Alt+U',
				'Cmd+Option+F9',
				'Command+Option+F9',
				'Ctrl+Shift+Z',
				'Control+Shift+Z',
				'Command+Shift+Alt+B',
				'Shift+Alt+CommandOrControl+B',
				'CmdOrCtrl+Alt+B',
				'CommandOrControl+Alt+B',
				'Control+Alt+Shift+F11',
			];

			testCases.forEach(accelerator => {
				expect(KeymapService.isAccelerator(accelerator)).toBeTruthy();
			});
		});

		it('should identify invalid Accelerators', () => {
			const testCases = [
				'',
				'+',
				'A+Z',
				'Control',
				'Command',
				'Command+Alt',
				'Control+Shift+Alt',
				'Command+H+A',
				'Control+Shift+Alt+J+O+P',
				'Contrl+F9',
				'Controller+Shift+X',
				'Command+Option+Shoft+T',
			];

			testCases.forEach(accelerator => {
				expect(KeymapService.isAccelerator(accelerator)).not.toBeTruthy();
			});
		});
	});

	describe('localizeAccelerator', () => {
		it('should convert CmdOrControl/CommandOrControl modifiers to the current platform', () => {
			const testCases = [
				['CmdOrCtrl+X', 'Cmd+X', 'Ctrl+X'],
				['CmdOrCtrl+Shift+Y', 'Shift+Cmd+Y', 'Ctrl+Shift+Y'],
				['CommandOrControl+X', 'Cmd+X', 'Ctrl+X'],
				['CommandOrControl+Shift+Y', 'Shift+Cmd+Y', 'Ctrl+Shift+Y'],
				['CmdOrCtrl+Alt+Y', 'Option+Cmd+Y', 'Ctrl+Alt+Y'],
				['CommandOrControl+Option+Y', 'Option+Cmd+Y', 'Ctrl+Alt+Y'],
			];

			testCases.forEach(testCase => expect(KeymapService.localizeAccelerator(testCase[0])).toEqual(
				shim.isMac() ? testCase[1] : testCase[2]
			));
		});

		it('should convert Command/Control modifiers to Cmd/Ctrl modifiers', () => {
			const testCases = shim.isMac()
				? [
					['Command+X', 'Cmd+X'],
					['Command+Shift+Y', 'Shift+Cmd+Y'],
					['Control+X', 'Ctrl+X'],
					['Control+Shift+Y', 'Ctrl+Shift+Y'],
				] : [
					['Control+X', 'Ctrl+X'],
					['Control+Shift+Y', 'Ctrl+Shift+Y'],
					['Control+Alt+Shift+Y', 'Ctrl+Alt+Shift+Y'],
				];

			testCases.forEach(testCase => {
				expect(KeymapService.localizeAccelerator(testCase[0])).toEqual(testCase[1]);
			});
		});

		it('should reorder modifiers', () => {
			const testCases = shim.isMac()
				? [
					['Command+Shift+X', 'Shift+Cmd+X'],
					['Command+Option+Y', 'Option+Cmd+Y'],
					['Control+Command+X', 'Ctrl+Cmd+X'],
					['Command+Control+Shift+Y', 'Ctrl+Shift+Cmd+Y'],
				] : [
					['Alt+Control+X', 'Ctrl+Alt+X'],
					['Control+Shift+Y', 'Ctrl+Shift+Y'],
					['Shift+Ctrl+Y', 'Ctrl+Shift+Y'],
					['Control+Shift+Alt+Y', 'Ctrl+Alt+Shift+Y'],
				];

			testCases.forEach(testCase => {
				expect(KeymapService.localizeAccelerator(testCase[0])).toEqual(testCase[1]);
			});
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
					{ command: 'showLocalSearch', accelerator: 'Option+Cmd+S' }, /* Mixed with shorthand */
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },  /* Mixed with shorthand */
					{ command: 'printItem', accelerator: null /* Disabled */ },
					{ command: 'focusNoteTitle', accelerator: 'Option+Shift+Cmd+T' },
					{ command: 'focusNoteBody', accelerator: 'Control+Option+Shift+Cmd+B' },
				] : [
					{ command: 'newNoteItem', accelerator: 'Control+Alt+Shift+N' },
					{ command: 'synchronize', accelerator: 'F15' },
					{ command: 'textBold', accelerator: 'Shift+F5' },
					{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' }, /* Mixed with shorthand */
					{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },  /* Mixed with shorthand */
					{ command: 'printItem', accelerator: null /* Disabled */ },
					{ command: 'focusNoteTitle', accelerator: 'Control+Alt+Shift+T' },
					{ command: 'focusNoteBody', accelerator: 'Control+Alt+Shift+B' },
				];

			testCases.forEach(({ command, accelerator }) => {
				const _accelerator = keymapService.getAccelerator(command); // default Accelerator
				keymapService.setAccelerator(command, accelerator);

				expect(keymapService.getAccelerator(command)).toEqual(
					// Because Control/Command will be returned as Ctrl/Cmd
					KeymapService.localizeAccelerator(accelerator)
				);

				// This test will fail if test cases are setting Accelerators to their default values
				expect(keymapService.getAccelerator(command)).not.toEqual(
					// Because Control/Command will be returned as Ctrl/Cmd
					KeymapService.localizeAccelerator(_accelerator)
				);
			});
		});
	});

	describe('resetAccelerator', () => {
		beforeEach(() => keymapService.resetKeymap());

		it('should reset the Accelerator', () => {
			const testCases = [
				{ command: 'newNoteItem', accelerator: 'CmdOrCtrl+Alt+Shift+N' },
				{ command: 'synchronize', accelerator: null /* Disabled */ },
				{ command: 'textBold', accelerator: 'Shift+F5' },
				{ command: 'showLocalSearch', accelerator: 'CmdOrCtrl+Alt+S' },
				{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
				{ command: 'printItem', accelerator: 'Alt+P' },
				{ command: 'focusNoteTitle', accelerator: 'CmdOrCtrl+Alt+Shift+T' },
				{ command: 'focusNoteBody', accelerator: 'CmdOrCtrl+Alt+Shift+B' },
			];

			testCases.forEach(({ command, accelerator }) => {
				// Remember the default Accelerator value
				const _accelerator = keymapService.getAccelerator(command);

				// Update the Accelerator,
				keymapService.setAccelerator(command, accelerator);
				expect(keymapService.getAccelerator(command)).toEqual(
					// Because Control/Command will be returned as Ctrl/Cmd
					KeymapService.localizeAccelerator(accelerator)
				);

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

		describe('with default commands', () => {
			it('should not throw and update the keymap', () => {
				const customKeymap = shim.isMac()
					? [
						{ command: 'newNoteItem', accelerator: 'Option+Shift+Cmd+N' },
						{ command: 'synchronize', accelerator: 'F11' },
						{ command: 'textBold', accelerator: 'Shift+F5' },
						{ command: 'showLocalSearch', accelerator: 'Ctrl+Option+S' },
						{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
						{ command: 'printItem', accelerator: 'Option+P' },
						{ command: 'help', accelerator: null /* Disabled */ },
						{ command: 'focusNoteTitle', accelerator: 'Ctrl+Option+Shift+T' },
						{ command: 'focusNoteBody', accelerator: 'Option+Shift+Cmd+B' },
						{ command: 'focusSidebar', accelerator: 'Shift+Cmd+L' /* Default of focusNoteList */ },
						{ command: 'focusNoteList', accelerator: 'Shift+Cmd+S' /* Default of focusSidebar */ },
					] : [
						{ command: 'newNoteItem', accelerator: 'Ctrl+Alt+Shift+N' },
						{ command: 'synchronize', accelerator: 'F11' },
						{ command: 'textBold', accelerator: 'Shift+F5' },
						{ command: 'showLocalSearch', accelerator: 'Ctrl+Alt+S' },
						{ command: 'gotoAnything', accelerator: 'Ctrl+Shift+G' },
						{ command: 'printItem', accelerator: 'Alt+P' },
						{ command: 'help', accelerator: null /* Disabled */ },
						{ command: 'focusNoteTitle', accelerator: 'Ctrl+Alt+Shift+T' },
						{ command: 'focusNoteBody', accelerator: 'Ctrl+Alt+Shift+B' },
						{ command: 'focusSidebar', accelerator: 'Ctrl+Shift+L' /* Default of focusNoteList */ },
						{ command: 'focusNoteList', accelerator: 'Ctrl+Shift+S' /* Default of focusSidebar */ },
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
						{ command: 'showLocalSearch', accelerator: 'CommandOrControl+Alt+S' },
						{ commmmmand: 'gotoAnything', accelerator: 'Control+Shift+G' },
						{ command: 'printItem', accelerator: 'Alt+P' },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'CommandOrControl+Alt+S' },
						{ command: 'gotoAnything', accelerator: 'Control+Shift+G' },
						{ accelerator: 'Alt+P' },
					],
					[
						{ command: 'showLocalSearch', accel: 'CommandOrControl+Alt+S' },
						{ command: 'gotoAnything', accelerator: 'Control+Shift+G' },
						{ command: 'printItem', accelerator: 'Alt+P' },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'CommandOrControl+Alt+S' },
						{ command: 'gotoAnything', accelerator: 'Control+Shift+G' },
						{ command: 'printItem' },
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
					{ command: 'gotoAnything', accelerator: 'Control+Shift+G' },
					{ command: 'printItem', accelerator: 'Alt+P' },
					{ command: 'focusNoteTitle', accelerator: 'CommandOrControl+Alt+Shift+J+O+P+L+I+N' },
				];

				expect(() => keymapService.setKeymap(customKeymap)).toThrow();
			});

			it('should throw when the provided commands are invalid', () => {
				const customKeymap = [
					{ command: 'totallyInvalidCommand', accelerator: 'Control+Shift+G' },
					{ command: 'printItem', accelerator: 'Alt+P' },
					{ command: 'focusNoteTitle', accelerator: 'CommandOrControl+Alt+Shift+J' },
				];

				expect(() => keymapService.setKeymap(customKeymap)).toThrow();
			});

			it('should throw when duplicate accelerators are provided', () => {
				const customKeymaps = [
					[
						{ command: 'showLocalSearch', accelerator: 'Command+Alt+S' },
						{ command: 'gotoAnything', accelerator: 'Command+Alt+S' /* Duplicate */ },
						{ command: 'printItem', accelerator: 'Alt+P' },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'Control+Alt+S' },
						{ command: 'gotoAnything', accelerator: 'Command+Alt+S' /* Duplicate */ },
						{ command: 'printItem', accelerator: 'Command+Alt+S' /* Duplicate */ },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'Command+Alt+S' },
						{ command: 'printItem', accelerator: shim.isMac() ? 'Command+G' : 'Control+G' /* Default of gotoAnything */ },
						{ command: 'focusNoteTitle', accelerator: 'Control+Alt+Shift+J' },
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
						expect(keymapService.getAccelerator(customKeymap[j].command)).not.toEqual(
							// Also localize testcases because they're also localized while updating
							KeymapService.localizeAccelerator(customKeymap[j].accelerator)
						);
					}
				}
			});
		});


		describe('with modifiers in mixed-form', () => {
			if ('should detect duplicates if one Accelerator uses long-form', () => {
				const customKeymaps = [
					[
						{ command: 'showLocalSearch', accelerator: shim.isMac() ? 'Option+Command+S' : 'Control+Alt+S' },
						{ command: 'gotoAnything', accelerator: shim.isMac() ? 'Option+Cmd+S' : 'Ctrl+Alt+S'  /* Duplicate of above command */ },
						{ command: 'printItem', accelerator: 'Alt+P' },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'Command+Alt+S' },
						{ command: 'printItem', accelerator: shim.isMac() ? 'Cmd+G' : 'Ctrl+G' /* Default of gotoAnything */ },
						{ command: 'focusNoteTitle', accelerator: 'Control+Alt+Shift+J' },
					],
					[
						{ command: 'showLocalSearch', accelerator: 'Command+Alt+S' },
						{ command: 'printItem', accelerator: shim.isMac() ? 'Command+G' : 'Control+G' /* Default of gotoAnything */ },
						{ command: 'focusNoteTitle', accelerator: 'Control+Alt+Shift+J' },
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
						expect(keymapService.getAccelerator(customKeymap[j].command)).not.toEqual(
							KeymapService.localizeAccelerator(customKeymap[j].accelerator)
						);
					}
				}
			});

			describe('with modifiers in different order', () => {
				if ('should detect duplicates if order of the modifiers is different', () => {
					const customKeymaps = [
						[
							{ command: 'showLocalSearch', accelerator: shim.isMac() ? 'Option+Shift+Command+S' : 'Control+Alt+Shift+S' },
							{ command: 'gotoAnything', accelerator: shim.isMac() ? 'Shift+Option+Command+S' : 'Control+Shift+Alt+S' /* Duplicate of above command */ },
							{ command: 'printItem', accelerator: 'Alt+P' },
						],
						[
							{ command: 'showLocalSearch', accelerator: shim.isMac() ? 'Option+Shift+Command+S' : 'Ctrl+Alt+Shift+S' },
							{ command: 'gotoAnything', accelerator: shim.isMac() ? 'Option+Shift+Cmd+S' : 'Control+Alt+Shift+S' /* Duplicate of above command */ },
							{ command: 'printItem', accelerator: 'Alt+P' },
						],
						[
							{ command: 'showLocalSearch', accelerator: 'Command+Alt+Shift+S' },
							{ command: 'gotoAnything', accelerator: 'Cmd+Shift+Alt+X' },
							{ command: 'printItem', accelerator: shim.isMac() ? 'Option+Cmd+T' : 'Alt+Ctrl+T'  /* Duplicate of setTags, but in different order */ },
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
							expect(keymapService.getAccelerator(customKeymap[j].command)).not.toEqual(
								KeymapService.localizeAccelerator(customKeymap[j].accelerator)
							);
						}
					}
				});
			});
		});
	});
});
