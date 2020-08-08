import { useState, useEffect } from 'react';
import CommandService, { ToolbarButtonInfo } from 'lib/services/CommandService';

interface ToolbarButtonInfos {
	[key:string]: ToolbarButtonInfo;
}

export default function useNoteToolbarButtons():ToolbarButtonInfos {
	const [noteToolbarButtons, setNoteToolbarButtons] = useState<ToolbarButtonInfos>({});

	function update() {
		const buttonNames = ['historyBackward', 'historyForward', 'toggleEditors', 'startExternalEditing'];
		const output:ToolbarButtonInfos = {};

		for (const buttonName of buttonNames) {
			output[buttonName] = CommandService.instance().commandToToolbarButton(buttonName);
		}

		setNoteToolbarButtons(output);
	}

	useEffect(() => {
		update();

		CommandService.instance().on('commandsEnabledStateChange', update);

		return () => {
			CommandService.instance().off('commandsEnabledStateChange', update);
		};
	}, []);

	return noteToolbarButtons;
}
