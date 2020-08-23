import { useState } from 'react';
import KeymapService from '../../../lib/services/KeymapService';

interface CommandEditing {
    [commandName: string]: boolean
}

const useEditing = (): [CommandEditing, (commandName: string) => void, (commandName: string) => void] => {
	const keymapService = KeymapService.instance();

	const [editing, setEditing] = useState<CommandEditing>(() =>
		keymapService.getCommandNames().reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {})
	);

	const disableEditing = (commandName: string) => setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	const enableEditing = (commandName: string) => {
		const newEditing: CommandEditing = {};

		setEditing(prevEditing => {
			Object.keys(prevEditing).forEach(key => newEditing[key] = false);
			newEditing[commandName] = true;

			return newEditing;
		});
	};

	return [editing, enableEditing, disableEditing];
};

export default useEditing;
