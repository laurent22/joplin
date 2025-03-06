import { Client } from 'ldapts';
import { User } from '../services/database/types';
import Logger from '@joplin/utils/Logger';
import { LdapConfig } from './types';
import { ErrorForbidden } from './errors';
import { readFile } from 'fs/promises';

const logger = Logger.create('LDAP');

export default async function ldapLogin(email: string, password: string, user: User, config: LdapConfig): Promise<User> {

	const enabled = config.enabled;
	const userCreation = config.userCreation;
	const host = config.host;
	const mailAttribute = config.mailAttribute;
	const fullNameAttribute = config.fullNameAttribute;
	const baseDN = config.baseDN;
	const bindDN = config.bindDN;
	const bindPW = config.bindPW;
	const tlsCaFile = config.tlsCaFile;

	logger.info(`Starting authentication with Server ${host}`);

	if (password === '') {
		throw new ErrorForbidden('no password entered');
	}

	if (enabled) {
		let searchResults;

		let tlsOptions;
		if (tlsCaFile.length !== 0) {
			tlsOptions = {
				ca: [await readFile(tlsCaFile)],
			};
		}

		const client = new Client({
			url: host,
			timeout: 5000,
			connectTimeout: 1000,
			tlsOptions: tlsOptions,
		});

		if (bindDN.length !== 0) {
			try {
				await client.bind(bindDN, bindPW);
			} catch (error) {
				error.message = `Could not bind to the ldap server ${host}: ${error.message}`;
				throw error;
			}
		}

		try {
			searchResults = await client.search(baseDN, {
				filter: `(${mailAttribute}=${email})`,
				attributes: ['dn', fullNameAttribute],
			});

			if (searchResults.searchEntries.length === 0) return null;

		} catch (error) {
			error.message = `Could not search the ldap server ${host}: ${error.message}`;
			throw error;
		}

		if (bindDN.length !== 0) {
			await client.unbind();
		}

		try {
			await client.bind(searchResults.searchEntries[0].dn, password);
		} catch (error) {
			if (error.code === 49) return null;
			error.message = `Could not login ${host}: ${error.message}`;
			throw error;
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
