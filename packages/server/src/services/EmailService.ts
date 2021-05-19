import Logger from '@joplin/lib/Logger';
import UserModel from '../models/UserModel';
import BaseService from './BaseService';
import Mail = require('nodemailer/lib/mailer');
import { createTransport } from 'nodemailer';

const logger = Logger.create('EmailService');

export default class EmailService extends BaseService {

	private transport_:any;

	private async transport():Promise<Mail> {
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
			} catch (error) {
				this.enabled_ = false;
				this.transport_ = null;
				error.message = 'Could not initialize transporter. Service will be disabled: ' + error.message;
				throw error;
			}
		}

		return this.transport_;
	}

	private escapeEmailField(f:string):string {
		return f.replace(/[\n\r"<>]/g, '');
	}

	private formatNameAndEmail(email:string, name:string = ''):string {
		if (!email) throw new Error('Email is required');
		const output:string[] = [];
		if (name) output.push('"' + this.escapeEmailField(name) + '"');
		output.push((name ? '<' : '') + this.escapeEmailField(email) + (name ? '>' : ''));
		return output.join(' ');
	}

	protected async maintenance() {
		if (!this.enabled_) return;

		logger.info('Starting maintenance...');
		const startTime = Date.now();

		try {
			const users = await this.models.user().emailsNeedToBeSentUsers();
			const transport = await this.transport();

			for (const user of users) {
				const mail:Mail.Options = {
					from: this.formatNameAndEmail(this.config.mailer.noReplyEmail, this.config.mailer.noReplyName),
					to: this.formatNameAndEmail(user.email, user.full_name),
					subject: 'Welcome',
					text: 'Confirm your email: https://example.com',
				};

				await transport.sendMail(mail);
			}
		} catch (error) {
			logger.error('Could not run maintenance:', error);
		}

		logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		if (!this.config.mailer.host) {
			this.enabled_ = false;
			logger.info('Service will be disabled because mailer config is not set');
			return;
		}

		UserModel.eventEmitter.on('created', this.scheduleMaintenance);
		await super.runInBackground();
	}

}
