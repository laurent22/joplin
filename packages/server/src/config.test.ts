import { mailerSecurityForPort } from './config';
import { MailerSecurity } from './env';

describe('config', () => {

	it('should use starttls for port 587 when security is tls', () => {
		expect(mailerSecurityForPort(587, MailerSecurity.Tls)).toBe(MailerSecurity.Starttls);
	});

	it('should use tls for port 465 when security is starttls', () => {
		expect(mailerSecurityForPort(465, MailerSecurity.Starttls)).toBe(MailerSecurity.Tls);
	});

	it('should keep starttls for port 587 when security is already starttls', () => {
		expect(mailerSecurityForPort(587, MailerSecurity.Starttls)).toBe(MailerSecurity.Starttls);
	});

	it('should keep tls for port 465 when security is already tls', () => {
		expect(mailerSecurityForPort(465, MailerSecurity.Tls)).toBe(MailerSecurity.Tls);
	});

	it('should not modify security for non-standard ports', () => {
		expect(mailerSecurityForPort(25, MailerSecurity.Tls)).toBe(MailerSecurity.Tls);
		expect(mailerSecurityForPort(2525, MailerSecurity.Starttls)).toBe(MailerSecurity.Starttls);
	});

});
