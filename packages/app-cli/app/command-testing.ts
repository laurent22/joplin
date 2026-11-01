import BaseCommand from './base-command';
import { reg } from '@joplin/lib/registry';
import Note from '@joplin/lib/models/Note';
import uuid from '@joplin/lib/uuid';
import populateDatabase from '@joplin/lib/services/debug/populateDatabase';
import { readCredentialFile } from '@joplin/lib/utils/credentialFiles';
import JoplinServerApi, { Session } from '@joplin/lib/JoplinServerApi';

function randomElement<T>(array: T[]): T | null {
	if (!array.length) return null;
	return array[Math.floor(Math.random() * array.length)];
}

function itemCount(args: { arg0: string }) {
	const count = Number(args.arg0);
	if (!count || isNaN(count)) throw new Error('Note count must be specified');
	return count;
}

class Command extends BaseCommand {
	public usage() {
		return 'testing <command> [arg0]';
	}

	public description() {
		return 'testing';
	}

	public enabled() {
		return false;
	}

	public options(): [string, string][] {
		return [
			['--folder-count <count>', 'Folders to create'],
			['--note-count <count>', 'Notes to create'],
			['--tag-count <count>', 'Tags to create'],
			['--tags-per-note <count>', 'Tags per note'],
			['--silent', 'Silent'],
		];
	}

	public async action(args: { command: string; arg0: string; options: { 'folder-count'?: number; 'note-count'?: number; 'tag-count'?: number; 'tags-per-note'?: number; silent?: number } }) {
		const { command, options } = args;

		if (command === 'populate') {
			await populateDatabase(reg.db(), {
				folderCount: options['folder-count'],
				noteCount: options['note-count'],
				tagCount: options['tag-count'],
				tagsPerNote: options['tags-per-note'],
				silent: options['silent'],
			});
		}

		const promises: Promise<unknown>[] = [];

		if (command === 'createRandomNotes') {
			const noteCount = itemCount(args);

			for (let i = 0; i < noteCount; i++) {
				promises.push(Note.save({
					title: `Note ${uuid.createNano()}`,
				}));
			}
		}

		if (command === 'updateRandomNotes') {
			const noteCount = itemCount(args);

			const noteIds = await Note.allIds();

			for (let i = 0; i < noteCount; i++) {
				const noteId = randomElement(noteIds);
				promises.push(Note.save({
					id: noteId,
					title: `Note ${uuid.createNano()}`,
				}));
			}
		}

		if (command === 'deleteRandomNotes') {
			const noteCount = itemCount(args);
			const noteIds = await Note.allIds();

			for (let i = 0; i < noteCount; i++) {
				const noteId = randomElement(noteIds);
				promises.push(Note.delete(noteId, { sourceDescription: 'command-testing' }));
			}
		}

		if (command === 'joplinServerParallelItemUpdate') {
			const randomContent = () => {
				const charCount = Math.random() * 1000;
				return 'a'.repeat(charCount);
			};

			const joplinServerAuth = JSON.parse(await readCredentialFile('joplin-server-test.json'));

			const api = new JoplinServerApi({
				baseUrl: () => joplinServerAuth.baseUrl,
				userContentBaseUrl: () => joplinServerAuth.userContentBaseUrl,
				username: () => joplinServerAuth.email,
				password: () => joplinServerAuth.password,
				apiKey: () => '',
				session: (): Session => null,
			});

			const apiPut = async () => {
				await api.exec('PUT', 'api/items/root:/testing:/content', {}, randomContent(), {
					'Content-Type': 'application/octet-stream',
				});
			};

			await apiPut();

			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(void apiPut());
			}
			await Promise.all(promises);

			// eslint-disable-next-line no-console
			console.info(await api.exec('GET', 'api/items/root:/testing:'));
		}

		await Promise.all(promises);
	}

}

module.exports = Command;
