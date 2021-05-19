import EmailService from './EmailService';
import ShareService from './ShareService';

export interface Services {
	share: ShareService;
	email: EmailService,
}
