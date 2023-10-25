import config from '../config';
import { Client } from 'ldapts';
import { User } from '../services/database/types';
import Logger from '@joplin/utils/Logger';

export default async function ldapLogin(email: string, password: string, user: User, serverNumber: number): Promise<User> {
	const logger = Logger.create('LDAP');

	const enabled = serverNumber === 1 ? config().ldap_1.enabled : config().ldap_2.enabled;
	const userCreation = serverNumber === 1 ? config().ldap_1.userCreation : config().ldap_2.userCreation;
	const host = serverNumber === 1 ? config().ldap_1.host : config().ldap_2.host;
	const mailAttribute = serverNumber === 1 ? config().ldap_1.mailAttribute : config().ldap_2.mailAttribute;
	const fullNameAttribute = serverNumber === 1 ? config().ldap_1.fullNameAttribute : config().ldap_2.fullNameAttribute;
	const baseDN = serverNumber === 1 ? config().ldap_1.baseDN : config().ldap_2.baseDN;
	const bindDN = serverNumber === 1 ? config().ldap_1.bindDN : config().ldap_2.bindDN;
	const bindPW = serverNumber === 1 ? config().ldap_1.bindPW : config().ldap_2.bindPW;

	logger.info(`Starting authentication with Server ${serverNumber}`);

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
			logger.error(`Could not search ldap server ${serverNumber}`);
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
