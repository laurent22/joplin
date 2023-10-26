import { Client } from 'ldapts';
import { User } from '../services/database/types';
import Logger from '@joplin/utils/Logger';
import { LdapConfig } from './types';

export default async function ldapLogin(email: string, password: string, user: User, config: LdapConfig): Promise<User> {
	const logger = Logger.create('LDAP');

	const enabled = config.enabled;
	const userCreation = config.userCreation;
	const host = config.host;
	const mailAttribute = config.mailAttribute;
	const fullNameAttribute = config.fullNameAttribute;
	const baseDN = config.baseDN;
	const bindDN = config.bindDN;
	const bindPW = config.bindPW;

	logger.info(`Starting authentication with Server ${host}`);

	if (password === '') {
		logger.error('no password entered');
		throw new Error('no password entered');
	}

	if (enabled) {
		let searchResults;
		const client = new Client({
			url: host,
			timeout: 2000,
			connectTimeout: 1000,
		});

		if (bindDN.length !== 0) {
			try {
				await client.bind(bindDN, bindPW);
			} catch (ex) {
				throw new Error('Could not bind to LDAP server.');
			}
		}

		try {
			searchResults = await client.search(baseDN, {
				filter: `(${mailAttribute}=${email})`,
				attributes: ['dn', fullNameAttribute],
			});
		} catch (ex) {
			logger.error(`Could not search ldap server ${host}`);
			return null;
		}

		if (bindDN.length !== 0) {
			await client.unbind();
		}

		try {
			await client.bind(searchResults.searchEntries[0].dn, password);
		} catch (ex) {
			return null;
		} finally {
			await client.unbind();
		}

		if (userCreation && !user) {
			const ldapUser: User = {};
			ldapUser.email = email;
			ldapUser.password = password;
			ldapUser.email_confirmed = 1;
			ldapUser.full_name = searchResults.searchEntries[0][fullNameAttribute].toString();
			return ldapUser;
		}
		return user;
	}
	return null;
}
