import Logger from '@joplin/utils/Logger';
import ClientPool from '../ClientPool';
import { createInterface } from 'readline/promises';

const logger = Logger.create('openDebugSession');

const openDebugSession = async (clients: ClientPool) => {
	const allClients = clients.clients;
	const clientChoices = allClients.map((client, index) => {
		return `${index}: ${client.label}`;
	}).join('\n');

	const askForClient = async (questionPrefix = '') => {
		// Recreate the readline interface each time to avoid conflicting
		// with the debug sessions for the individual clients.
		const readlineInterface = createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		try {
			const clientChoice = await readlineInterface.question(
				`${questionPrefix}Select a client from:\n${clientChoices}\nclient: `,
			);
			if (clientChoice.trim() === '' || clientChoice === 'exit') {
				return null;
			}

			const asNumber = Number(clientChoice);
			if (!isFinite(asNumber) || Math.floor(asNumber) !== asNumber) {
				return askForClient('Please input an integer. ');
			}

			if (asNumber < 0 || asNumber >= allClients.length) {
				return askForClient('Choice out of range. ');
			}

			return allClients[asNumber];
		} finally {
			readlineInterface.close();
		}
	};

	for (let client = await askForClient(); client; client = await askForClient()) {
		logger.info('Switching to client', client.getHelpText());

		await client.startCliDebugSession();
	}
};

export default openDebugSession;
