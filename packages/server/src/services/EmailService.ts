import Logger from '@joplin/lib/Logger';
import BaseService from './BaseService';
import Mail = require('nodemailer/lib/mailer');
import { createTransport } from 'nodemailer';
import { Email, EmailSender } from '../db';
import { errorToString } from '../utils/errors';
import MarkdownIt = require('markdown-it');
import EmailModel from '../models/EmailModel';

const logger = Logger.create('EmailService');

interface Participant {
	name: string;
	email: string;
}

export default class EmailService extends BaseService {

	private transport_: any;

	private async transport(): Promise<Mail> {
		if (!this.transport_) {
			this.transport_ = createTransport({
				host: this.config.mailer.host,
				port: this.config.mailer.port,
				secure: this.config.mailer.secure,
				auth: {
					user: this.config.mailer.authUser,
					pass: this.config.mailer.authPassword,
				},
			});

			try {
				await this.transport_.verify();
				logger.info('Transporter is operational - service will be enabled');
			} catch (error) {
				this.enabled_ = false;
				this.transport_ = null;
				error.message = `Could not initialize transporter. Service will be disabled: ${error.message}`;
				throw error;
			}
		}

		return this.transport_;
	}

	private senderInfo(senderId: EmailSender): Participant {
		if (senderId === EmailSender.NoReply) {
			return {
				name: this.config.mailer.noReplyName,
				email: this.config.mailer.noReplyEmail,
			};
		}

		throw new Error(`Invalid sender ID: ${senderId}`);
	}

	private markdownBodyToPlainText(md: string): string {
		// Just convert the links to plain URLs
		return md.replace(/\[.*\]\((.*)\)/g, '$1');
	}

	private markdownBodyToHtml(md: string): string {
		const markdownIt = new MarkdownIt();
		return markdownIt.render(md);
	}

	private escapeEmailField(f: string): string {
		return f.replace(/[\n\r"<>]/g, '');
	}

	private formatNameAndEmail(email: string, name: string = ''): string {
		if (!email) throw new Error('Email is required');
		const output: string[] = [];
		if (name) output.push(`"${this.escapeEmailField(name)}"`);
		output.push((name ? '<' : '') + this.escapeEmailField(email) + (name ? '>' : ''));
		return output.join(' ');
	}

	protected async maintenance() {
		if (!this.enabled_) return;

		logger.info('Starting maintenance...');
		const startTime = Date.now();

		try {
			const emails = await this.models.email().needToBeSent();
			const transport = await this.transport();

			for (const email of emails) {
				const sender = this.senderInfo(email.sender_id);

				const mailOptions: Mail.Options = {
					from: this.formatNameAndEmail(sender.email, sender.name),
					to: this.formatNameAndEmail(email.recipient_email, email.recipient_name),
					subject: email.subject,
					text: this.markdownBodyToPlainText(email.body),
					html: this.markdownBodyToHtml(email.body),
				};

				const emailToSave: Email = {
					id: email.id,
					sent_time: Date.now(),
				};

				try {
					await transport.sendMail(mailOptions);
					emailToSave.sent_success = 1;
					emailToSave.error = '';
				} catch (error) {
					emailToSave.sent_success = 0;
					emailToSave.error = errorToString(error);
				}

				await this.models.email().save(emailToSave);
			}
		} catch (error) {
			logger.error('Could not run maintenance:', error);
		}

		logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		if (!this.config.mailer.host || !this.config.mailer.enabled) {
			this.enabled_ = false;
			logger.info('Service will be disabled because mailer config is not set or is explicitly disabled');
			return;
		}

		EmailModel.eventEmitter.on('queued', () => {
			logger.info('Email was queued - scheduling maintenance');
			void this.scheduleMaintenance();
		});

		await super.runInBackground();
	}

}
