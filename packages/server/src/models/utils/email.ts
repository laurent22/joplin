/* eslint-disable import/prefer-default-export */

import config from '../../config';
import { EmailSender } from '../../services/database/types';

interface Participant {
	name: string;
	email: string;
}

const senders_: Record<number, Participant> = {};

export const senderInfo = (senderId: EmailSender): Participant => {
	if (!senders_[senderId]) {
		if (senderId === EmailSender.NoReply) {
			senders_[senderId] = {
				name: config().mailer.noReplyName,
				email: config().mailer.noReplyEmail,
			};
		} else if (senderId === EmailSender.Support) {
			senders_[senderId] = {
				name: config().supportName,
				email: config().supportEmail,
			};
		} else {
			throw new Error(`Invalid sender ID: ${senderId}`);
		}
	}

	return senders_[senderId];
};
