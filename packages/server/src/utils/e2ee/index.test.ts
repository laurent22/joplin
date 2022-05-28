import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import MasterKey from '@joplin/lib/models/MasterKey';
import { decryptNote, DownloadResourceHandler, renderNote, setupModels } from './index';
import { initGlobalLogger, supportDir, tempDir } from '../testing/testUtils';
import { readFile } from 'fs-extra';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import { LinkType, MarkupLanguage } from '@joplin/renderer';
import { ModelType } from '@joplin/lib/BaseModel';

const noteContent = `note test

![test.jpg](:/879da30580d94e4d899e54f029c84dd2)

id: 1bdb6d2cb7b840e0b414b5c8e682e2a6
parent_id: f6b6a796b65c4c239ed5b5d031f9172e
created_time: 2022-05-18T14:27:30.866Z
updated_time: 2022-05-19T15:05:16.630Z
is_conflict: 0
latitude: 51.50735090
longitude: -0.12775830
altitude: 0.0000
author: 
source_url: 
is_todo: 0
todo_due: 0
todo_completed: 0
source: joplindev
source_application: net.cozic.joplindev-cli
application_data: 
order: 1652884050866
user_created_time: 2022-05-18T14:27:30.866Z
user_updated_time: 2022-05-19T15:05:16.630Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 1
share_id: 
conflict_original_id: 
master_key_id: 
type_: 1`;

const resourceMetadataContent = `photo.jpg

id: 879da30580d94e4d899e54f029c84dd2
mime: image/jpeg
filename: photo.jpg
created_time: 2021-08-07T17:03:33.701Z
updated_time: 2021-08-07T17:03:33.701Z
user_created_time: 2021-08-07T17:03:33.701Z
user_updated_time: 2021-08-07T17:03:33.701Z
file_extension: jpg
encryption_cipher_text: 
encryption_applied: 0
encryption_blob_encrypted: 0
size: 2720
is_shared: 0
share_id: 
type_: 4`;

const setupEncryptionService = async () => {
	const fsDriver = new FsDriverNode();
	EncryptionService.fsDriver_ = fsDriver;

	const encryptionService = new EncryptionService();
	let masterKey = await encryptionService.generateMasterKey('111111', { appId: 'testing' });
	masterKey = await MasterKey.save(masterKey);
	await encryptionService.loadMasterKey(masterKey, '111111', true);

	return { encryptionService, masterKey };
};

describe('e2ee/index', () => {

	beforeAll(() => {
		initGlobalLogger();
		setupModels();
	});

	it('should decrypt note info', async () => {
		const { encryptionService, masterKey } = await setupEncryptionService();

		const ciphertext = await encryptionService.encryptString(noteContent);

		const noteInfo = await decryptNote(encryptionService, {
			ciphertext,
			masterKey,
		});

		expect(noteInfo.note.body).toBe('![test.jpg](:/879da30580d94e4d899e54f029c84dd2)');
		expect(noteInfo.note.title).toBe('note test');
		expect(noteInfo.note.type_).toBe(1);
		expect(Object.keys(noteInfo.linkedItemInfos).length).toBe(1);

		const linkedItemInfo = noteInfo.linkedItemInfos['879da30580d94e4d899e54f029c84dd2'];
		expect(linkedItemInfo).toEqual({
			item: {
				id: '879da30580d94e4d899e54f029c84dd2',
				type: 2,
				type_: 4,
			},
			localState: {
				fetch_status: 2,
			},
		});
	});

	it('should render a note', async () => {
		const { encryptionService } = await setupEncryptionService();

		const tmp = await tempDir();
		const encryptedFilePath = `${tmp}/photo.crypted`;
		await encryptionService.encryptFile(`${supportDir}/photo.jpg`, encryptedFilePath);
		const encryptedMd = await encryptionService.encryptString(resourceMetadataContent);

		const mockDownloadResource: DownloadResourceHandler = async (_getResourceTemplateUrl: string, _shareId: string, _resourceId: string, metadataOnly: boolean) => {
			if (metadataOnly) {
				return { encryption_cipher_text: encryptedMd } as any;
			} else {
				return readFile(encryptedFilePath, 'utf8');
			}
		};

		const result = await renderNote(encryptionService, {
			title: 'note test',
			body: '**bold** and an image: ![test.jpg](:/879da30580d94e4d899e54f029c84dd2) and a link to a resource: [link](:/879da30580d94e4d899e54f029c84dd2)',
			markup_language: MarkupLanguage.Markdown,
		}, {
			'879da30580d94e4d899e54f029c84dd2': {
				localState: {
					fetch_status: 2,
				},
				item: {
					id: '879da30580d94e4d899e54f029c84dd2',
					type_: ModelType.Resource,
					type: LinkType.Image,
				},
			},
		}, 'http://localhost/shares/SHARE_ID?resource_id=RESOURCE_ID&resource_metadata=RESOURCE_METADATA', 'abcdefgh', mockDownloadResource);

		// Check that the image is being displayed
		expect(result.html).toContain('<img data-from-md data-resource-id="879da30580d94e4d899e54f029c84dd2" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAByAHsDASIAAhEBAxEB/8QAHAAAAAcBAQAAAAAAAAAAAAAAAA');

		// Check that the link to the encrypted resource is available
		expect(result.html).toContain('FF2QQQAfuiO6CCYf/9k=\' download=\'photo.jpg\'>');
	});

});
