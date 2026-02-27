import { mailerSecurityForPort } from './config';
import { MailerSecurity } from './env';

describe('config', () => {

	it('should use starttls for port 587 when security is tls', () => {
		expect(mailerSecurityForPort(587, MailerSecurity.Tls)).toBe(MailerSecurity.Starttls);
	});

	it('should use tls for port 465 when security is starttls', () => {
		expect(mailerSecurityForPort(465, MailerSecurity.Starttls)).toBe(MailerSecurity.Tls);
	});

});
