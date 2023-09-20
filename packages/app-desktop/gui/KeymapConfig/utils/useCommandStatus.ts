import { useState } from 'react';
import KeymapService from '@joplin/lib/services/KeymapService';

const keymapService = KeymapService.instance();

interface CommandStatus {
	[commandName: string]: boolean;
}

const useCommandStatus = (): [CommandStatus, (commandName: string)=> void, (commandName: string)=> void] => {
	const [status, setStatus] = useState<CommandStatus>(() =>
		keymapService.getCommandNames().reduce((accumulator: CommandStatus, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {}),
	);

	const disableStatus = (commandName: string) => setStatus(prevStatus => ({ ...prevStatus, [commandName]: false }));
	const enableStatus = (commandName: string) => setStatus(prevStatus => {
		// Falsify all the commands; Only one command should be truthy at any given time
		const newStatus = Object.keys(prevStatus).reduce((accumulator: CommandStatus, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {});

		// Make the appropriate command truthful
		newStatus[commandName] = true;
		return newStatus;
	});

	return [status, enableStatus, disableStatus];
};

export default useCommandStatus;
