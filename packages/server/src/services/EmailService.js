"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/lib/Logger");
const BaseService_1 = require("./BaseService");
const nodemailer_1 = require("nodemailer");
const types_1 = require("../services/database/types");
const errors_1 = require("../utils/errors");
const EmailModel_1 = require("../models/EmailModel");
const utils_1 = require("./email/utils");
const env_1 = require("../env");
const email_1 = require("../models/utils/email");
const logger = Logger_1.default.create('EmailService');
class EmailService extends BaseService_1.default {
    transport() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.transport_) {
                try {
                    if (!(0, email_1.senderInfo)(types_1.EmailSender.NoReply).email) {
                        throw new Error('No-reply email must be set for email service to work (Set env variable MAILER_NOREPLY_EMAIL)');
                    }
                    // NodeMailer's TLS options are weird:
                    // https://nodemailer.com/smtp/#tls-options
                    const options = {
                        host: this.config.mailer.host,
                        port: this.config.mailer.port,
                        secure: this.config.mailer.security === env_1.MailerSecurity.Tls,
                        ignoreTLS: this.config.mailer.security === env_1.MailerSecurity.None,
                        requireTLS: this.config.mailer.security === env_1.MailerSecurity.Starttls,
                    };
                    if (this.config.mailer.authUser || this.config.mailer.authPassword) {
                        options.auth = {
                            user: this.config.mailer.authUser,
                            pass: this.config.mailer.authPassword,
                        };
                    }
                    this.transport_ = (0, nodemailer_1.createTransport)(options);
                    yield this.transport_.verify();
                    logger.info('Transporter is operational - service will be enabled');
                }
                catch (error) {
                    this.enabled_ = false;
                    this.transport_ = null;
                    error.message = `Could not initialize transporter. Service will be disabled: ${error.message}`;
                    throw error;
                }
            }
            return this.transport_;
        });
    }
    escapeEmailField(f) {
        return f.replace(/[\n\r"<>]/g, '');
    }
    formatNameAndEmail(email, name = '') {
        if (!email)
            throw new Error('Email is required');
        const output = [];
        if (name)
            output.push(`"${this.escapeEmailField(name)}"`);
        output.push((name ? '<' : '') + this.escapeEmailField(email) + (name ? '>' : ''));
        return output.join(' ');
    }
    maintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.enabled_)
                return;
            logger.info('Starting maintenance...');
            const startTime = Date.now();
            try {
                const emails = yield this.models.email().needToBeSent();
                const transport = yield this.transport();
                for (const email of emails) {
                    const sender = (0, email_1.senderInfo)(email.sender_id);
                    const mailOptions = {
                        from: this.formatNameAndEmail(sender.email, sender.name),
                        to: this.formatNameAndEmail(email.recipient_email, email.recipient_name),
                        subject: email.subject,
                        text: (0, utils_1.markdownBodyToPlainText)(email.body),
                        html: (0, utils_1.markdownBodyToHtml)(email.body),
                    };
                    const emailToSave = {
                        id: email.id,
                        sent_time: Date.now(),
                    };
                    try {
                        yield transport.sendMail(mailOptions);
                        emailToSave.sent_success = 1;
                        emailToSave.error = '';
                    }
                    catch (error) {
                        emailToSave.sent_success = 0;
                        emailToSave.error = (0, errors_1.errorToString)(error);
                    }
                    yield this.models.email().save(emailToSave);
                }
            }
            catch (error) {
                logger.error('Could not run maintenance:', error);
            }
            logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
        });
    }
    runInBackground() {
        const _super = Object.create(null, {
            runInBackground: { get: () => super.runInBackground }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.mailer.host || !this.config.mailer.enabled) {
                this.enabled_ = false;
                logger.info('Service will be disabled because mailer config is not set or is explicitly disabled');
                return;
            }
            EmailModel_1.default.eventEmitter.on('queued', () => {
                logger.info('Email was queued - scheduling maintenance');
                void this.scheduleMaintenance();
            });
            yield _super.runInBackground.call(this);
        });
    }
}
exports.default = EmailService;
//# sourceMappingURL=EmailService.js.map