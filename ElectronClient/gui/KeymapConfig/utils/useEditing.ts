import { useState } from 'react';
import KeymapService from '../../../lib/services/KeymapService';

const keymapService = KeymapService.instance();

interface CommandEditing {
	[commandName: string]: boolean
}

const useEditing = (): [CommandEditing, (commandName: string) => void, (commandName: string) => void] => {
	const [editing, setEditing] = useState<CommandEditing>(() =>
		keymapService.getCommandNames().reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {})
	);

	const disableEditing = (commandName: string) => setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	const enableEditing = (commandName: string) => setEditing(prevEditing => {
		// Disable editing state of all the commands
		const newEditing = Object.keys(prevEditing).reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {});

		// Enable editing state of the appropriate command
		newEditing[commandName] = true;
		return newEditing;
	});

	return [editing, enableEditing, disableEditing];
};

export default useEditing;
