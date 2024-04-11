import { ShareInvitation, ShareUserStatus } from '../../services/share/reducer';

let idCounter = 0;
const makeMockShareInvitation = (userName: string, userEmail: string, status: ShareUserStatus): ShareInvitation => {
	const shareTypeFolder = 3;
	return {
		id: `test-${idCounter++}`,
		master_key: null,
		share: {
			type: shareTypeFolder,
			id: `share-id-${idCounter++}`,
			folder_id: 'some-id-here',
			user: {
				id: `user-${idCounter++}`,
				full_name: userName,
				email: userEmail,
			},
			master_key_id: null,
			note_id: null,
		},
		status: status,
		can_read: 1,
		can_write: 1,
	};
};

export default makeMockShareInvitation;
