import { useEffect } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import KeymapService, { KeymapItem } from '@joplin/lib/services/KeymapService';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import normalizeAccelerator from '../../utils/normalizeAccelerator';
import { CodeMirrorVersion } from '../../utils/types';

const useKeymap = (editorControl: CodeMirrorControl) => {
	useEffect(() => {
		if (!editorControl) return () => {};

		// Some commands aren't registered with the command service
		// (e.g. Quit). Don't have CodeMirror handle these.
		// See gui/KeymapConfig/getLabel.ts.
		const isCommandRegistered = (commandName: string) => {
			const commandNames = CommandService.instance().commandNames();
			return commandNames.includes(commandName);
		};

		const keymapItemToCodeMirror = (binding: KeymapItem) => {
			if (!binding.accelerator || !isCommandRegistered(binding.command)) {
				return null;
			}

			return {
				key: normalizeAccelerator(
					binding.accelerator, CodeMirrorVersion.CodeMirror6,
				),
				run: () => {
					if (!CommandService.instance().isEnabled(binding.command)) {
						return false;
					}

					void CommandService.instance().execute(binding.command);
					return true;
				},
			};
		};

		const keymapItems = KeymapService.instance().getKeymapItems();
		const addedKeymap = editorControl.prependKeymap(
			keymapItems
				.map(item => keymapItemToCodeMirror(item))
				.filter(item => !!item),
		);

		return () => {
			addedKeymap.remove();
		};
	}, [editorControl]);
};

export default useKeymap;
