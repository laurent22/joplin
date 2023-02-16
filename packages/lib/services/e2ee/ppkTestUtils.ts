import { rsa } from './ppk';

interface TestData {
	publicKey: string;
	privateKey: string;
	plaintext: string;
	ciphertext: string;
}

// This is conveninent to quickly generate some data to verify for example that
// react-native-rsa can decrypt data from node-rsa and vice-versa.
export async function createTestData() {
	const plaintext = 'just testing';
	const keyPair = await rsa().generateKeyPair(2048);
	const ciphertext = await rsa().encrypt(plaintext, keyPair);

	return {
		publicKey: rsa().publicKey(keyPair),
		privateKey: rsa().privateKey(keyPair),
		plaintext,
		ciphertext,
	};
}

export async function printTestData() {
	// eslint-disable-next-line no-console
	console.info(JSON.stringify(await createTestData(), null, '\t'));
}

interface CheckTestDataOptions {
	throwOnError?: boolean;
	silent?: boolean;
}

export async function checkTestData(data: TestData, options: CheckTestDataOptions = null) {
	options = {
		throwOnError: false,
		silent: false,
		...options,
	};

	// First verify that the data coming from the other app can be decrypted.
	const messages: string[] = [];
	let hasError = false;

	const keyPair = await rsa().loadKeys(data.publicKey, data.privateKey);
	const decrypted = await rsa().decrypt(data.ciphertext, keyPair);
	if (decrypted !== data.plaintext) {
		messages.push('RSA Tests: Data could not be decrypted');
		messages.push('RSA Tests: Expected:', data.plaintext);
		messages.push('RSA Tests: Got:', decrypted);
		hasError = true;
	} else {
		messages.push('RSA Tests: Data could be decrypted');
	}

	// Then check that the public key can be used to encrypt new data, and then
	// decrypt it with the private key.

	{
		const encrypted = await rsa().encrypt('something else', keyPair);
		const decrypted = await rsa().decrypt(encrypted, keyPair);
		if (decrypted !== 'something else') {
			messages.push('RSA Tests: Data could not be encrypted, then decrypted');
			messages.push('RSA Tests: Expected:', 'something else');
			messages.push('RSA Tests: Got:', decrypted);
			hasError = true;
		} else {
			messages.push('RSA Tests: Data could be encrypted then decrypted');
		}
	}

	if (hasError && options.throwOnError) {
		throw new Error(`Testing RSA failed: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				console.warn(msg);
			} else {
				// eslint-disable-next-line no-console
				if (!options.silent) console.info(msg);
			}
		}
	}
}

// Data generated on mobile using react-native-rsa-native
const mobileData = {
	'publicKey': '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlEVSnwMpmGC+YaRw3B37BP1IBth02OFCrlZjlkn14OijnmQaOKGxhJtthvlVVEOEc50D+MMKZ1mJleER4FnD3CoGHaVZmZRa3wnuTblctF/in0mgywFJ6HlEXngUrWt2TkCnkwg4nP0IKlQ4URBxWGllVbWUgqUs5uAtV4mkrx+Ke68j+suoN8w5BF9WnYJCclDCplUOFx77llw1Z/7O8UjkgbfYKOnwMEpxlO1SVutNQNgD4BOtGn73ai0qjHKq5as8SKJb/ch+uAX95bJHlOOvBrHw718gcbnxkn6PEN3vl4/HbmHFj/V4zxG8ZF82+oTOh6m/HGdPPLpF8e98dQIDAQAB\n-----END PUBLIC KEY-----',
	'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAlEVSnwMpmGC+YaRw3B37BP1IBth02OFCrlZjlkn14OijnmQaOKGxhJtthvlVVEOEc50D+MMKZ1mJleER4FnD3CoGHaVZmZRa3wnuTblctF/in0mgywFJ6HlEXngUrWt2TkCnkwg4nP0IKlQ4URBxWGllVbWUgqUs5uAtV4mkrx+Ke68j+suoN8w5BF9WnYJCclDCplUOFx77llw1Z/7O8UjkgbfYKOnwMEpxlO1SVutNQNgD4BOtGn73ai0qjHKq5as8SKJb/ch+uAX95bJHlOOvBrHw718gcbnxkn6PEN3vl4/HbmHFj/V4zxG8ZF82+oTOh6m/HGdPPLpF8e98dQIDAQABAoIBAAl/FScdFz1suNTdKONYQjsUE9hoZbd8Wf57hv5Zt1dT3yLma22EIbAKGm5CKu5uMp4LCPWWXGS5LeA9HZ1+clZ4FJMyg3YcM+PEKZCt1huxZnzoRNWru/WZSsE4NK7UyquBZZo7tRCM/khjw4WhpXjRq01dh2kEtkcFRbItHTCgHgQxf3q+XoflVD9pZVj+EylP8vSodxtP1WkWb7fYOybestlvi8vwNQLoRO5PgFtjC0nOvwGnk6120XpWhP95EMy53iOygG9wfw7pxYTfSPEIQR53EGgiv8jc4WPYKc9SZea/bE0Rkt46/jMo6SpTrVNj5WwoCPwB012+edhlmaECgYEA0Q90zuD7cvjB16iDjdsvyZ0gBxozfgDsVNgPRNf/Rv3ol/Ycn/NcBi8XQKdw8NJXoPJbVbzzRvIbGqZLLgzOngjFJFiDW+7M/W2cwD1HFvDjEGYqtZqbLDWZYG0pX75kAB0YyI4ncelhr6nZMs/RMBIw9DGpoBMmP5CvXfgX6XECgYEAtY/Ava6DUKT93m6Sw9NnWesb60uEttvOCXVWQJfOzSLdbzWOw4IgG2YHE1+w+TQbumdt5tzczacvkW9C2KsPllBHeFtsDSTpe6ecuCzl6Ryv5FLg5JfQIErYje4ifmzm+DirMu4kEdsY1jfYnOYyoEo7OZEKRGttUPTH/wHGIUUCgYB3Y/9OQjf3cc6pzWfLtHg3CI+I3tK3S+mrjnQx2bTEoy6Y0gmI4x8TvQLnfnhGX6mBlcbJUQ4R3yPRdVSL6O56XAHR/uaNsvPIazfQpW4a0Nirvdz4N2IUvktoQQ8WyZEsa3GC34PxTtnlyvbqSLprXIgufMolS6pVNNihrpRhUQKBgC2d6p09xXxzl91VBsbwzJzI94DMvpF69G9n7b3Y5nqf8ebJHA9/GDYKEmkJt9tE/lp9Nh21DD0XbloqDC+H+yiXDv3sal97ELaizDtx/GnvbTn+oMaOZhpW88XlOQFutzFSe6EWODXMSJc5/NCe/cVMIUk7acr6+sJGXiFx/qfJAoGBAKVL/6KDBJqMEyqMs2Y0NpMS2Ia163RPJTiBJoIJYw3KOonaDkjk+7dAeYjGlKjLTWF2yckPbYVXmu9MrREGtIpb5oii5J2lFM5oDr40iZIZ5nBiXQfm/B7/IkpJ7IXOsYeiK+UDKSWW71GFeYtICfKlowolm0jBBS+M8XJjplz2\n-----END RSA PRIVATE KEY-----',
	'plaintext': 'just testing',
	'ciphertext': 'K+saH0/1Ltnc8GFqy1gKDpIY2o4OVkNFCQGFIp1574kkjLEKIgQpgc/kOdc7EO5m\r\nAN7TKh2zGrvcB9BqMOjsQNeausQzAm+b5fYWVyRHfQ5kf6+ojUO+LMRPxKqNO58m\r\nPw5/6R7zACJn1W9cHolY8+YKAeL+guQmCoD50nEgyZc5+HMRKGZpu+Vh7y562hYu\r\n39KPCcLFzWj7yi+JtbD4bFVcgPLg8T2PXCOqj+fVkAXXdkt8PnHfgf4lbfYojZ1d\r\nge7C1hx4aVrfT7vj2saXU/RrV9MlBDtAFZDynWa+LfMmt56TWCO6yWm5KpckGU/E\r\nfEs7l00aSskIai0ghZSIvQ==',
};

// Data generated on desktop using node-rsa
const desktopData = {
	'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAvLb8Lk0UBFEQ2UJsVMgKdbPYExhYqa87diBQiFBJglgNuZVi8/HX\nvpCVcH7BhdQKkA9Mh23SpNcYHR9JrzUTrn9Q21t1uj2J60+bfq1s0BA1wkS/xBPN\nrrLw2yCPpkZzNH8HcLx/MtMaOnOVfl5KqftXROzn+Vo3rrxNprd2ETLAxr+CC6SE\nTJiiP8ovUfH+TKZ3P2nkSyBy4oY24h4HA+wVnj12DspE8CMOXCyBUxlG2ki2c/sK\nDSDla3oEjB8QdpBKhIXD/Bb4MpLHfaby7O/eYjrteB8g6JU01JDsnQoomLe4FdCU\nnYK5sFNUQ89e05lMa3yxZWV3mXAVUi/mFwIDAQAB\n-----END RSA PUBLIC KEY-----',
	'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAvLb8Lk0UBFEQ2UJsVMgKdbPYExhYqa87diBQiFBJglgNuZVi\n8/HXvpCVcH7BhdQKkA9Mh23SpNcYHR9JrzUTrn9Q21t1uj2J60+bfq1s0BA1wkS/\nxBPNrrLw2yCPpkZzNH8HcLx/MtMaOnOVfl5KqftXROzn+Vo3rrxNprd2ETLAxr+C\nC6SETJiiP8ovUfH+TKZ3P2nkSyBy4oY24h4HA+wVnj12DspE8CMOXCyBUxlG2ki2\nc/sKDSDla3oEjB8QdpBKhIXD/Bb4MpLHfaby7O/eYjrteB8g6JU01JDsnQoomLe4\nFdCUnYK5sFNUQ89e05lMa3yxZWV3mXAVUi/mFwIDAQABAoIBAQCMIm2djEsi8XfL\nfZGoW2u4/7WiaF/ekWtcSp7Cuqv7iJuYhiAW+i21KvRttxLJ6C130ISJxLm5Aqi7\nZ3J2ErnsyEoouf/wLqZuAI19QhcdYgwpmJe2aOZBpktIzSMe3A3Mm8/QnYjvGufN\nI+uNDUPwed3SJwITnjTfIqGe/XlFRtvCIurp7vDbh4kTASpg3M8kjXiznVMncC4D\nWNg0vRnj53zfiwRkxZwMubYa25qR2Kt/S703QJVh/ctccbuZ6GyRbtgBlGuxuwX8\n1aAMBScMBMFtU+Xpb55EgsFu6Snzs6yrFKXMybR6ea31CtzBZvjZdGKO1Yxh2Dlf\n7f1PWg9hAoGBAPpLMPXFIsUtq6iwh1slDXZ+IgIIYgs/JkYvDROFUbp9qrnGcQBi\nIC9Dnf7fYwVnYQ18+gz2Qcjn9e+5Y/4aBPW2PjAYurdBMNGlEEKMbl3Ocad9h8mL\nI2MRBFOpwZaVhm8PJBZkhhfkNouh13KRyr9vS4egTdEBOZGR43GSrZ9fAoGBAMEE\nZVqaTg3jAh5GJBcxKGjz77BN0X5wRkYO9OU4DYuBq+sz+JVytLTMMDTtdxbJy11b\nH3wOuz1SugtouuJZ4hmwfXuj+2AFh28tiBcz6nik2pQYgdgowP7eqXor4T+Nd0mP\nzEqa7+W62pNAVlA0DiR8obPmzKNwBm2OZXxR6wxJAoGAC6T95SFDydqjFtkHoxTp\nOG8L0/5h2VYZyMAdop/cOonoLHZwAW2PQ8OokRgBelnh6Qe8dmfqjZdFGN8OKN87\nBddxszkjTq1IwSglxoLUC6c0IG+1ponDnrNG+UF3kTLpqzcQHb6Vgn0KkJp59ImV\n3iwmXmv10th0vjIEW99QFo8CgYEAkqF/SdwtbdlF06/fXQsIMusV7K7Bdrdee3yD\nSNtTVub0ruK1dvtEEpGIEb1QmixE5TADdCBQ2B5Pnbk7OBemb3OncFU7809f+vLx\nDwdumaZLMvSHN6qGK1kGEPziyn/y3hxyyz52/uP7hp/6skVJdSiFQ4ETdxn0mCf0\nKwSkdpkCgYBDMXv2N3eF2IElZkN+8rQYHqWck1HqTcSnlrHS0i0uPQduQa+K/O+G\nVE2S8htp4/D0Gd3EwuDBIT3vUvnx7YBuMX1fXwU0m7oKKOyQqhxfrt9t7BEh2j5r\n5pvRU7dTKVbua78w1sQQMtYnWUyukBlaF/IpHPi5hwCjmDQR1EJY4w==\n-----END RSA PRIVATE KEY-----',
	'plaintext': 'just testing',
	'ciphertext': 'PRqiQjxnQMukoYPA9XtlGcgAjwuDJd24GtJ3iO2qhh0HnbPnx3c8ZaGWJyV1ejZCwIWv509js7sCTHtXqeGkZr//Db6oOIyi77VzRwvzPxReHPefF0rX62uMh+zTmQW7KSrFeAvtnpWiDcyynUtwycgrZcQCHZoEmSSyc3cyj09HgqEoSQb0BOc8daR0aXwOpgXsB8ypf3+m23U1gZmIyl0glymTN9h1jopV9dRtw5ufcc4ve/hHKp0gbaT2OaRKOLr6AXmbDGwkF5bsvjV+v4tTkj96OUjoG9qUMQh/JYRMl7mxJriUB3Jc6WHEKRVPQYAIZODfEOy3rkHwWAcYjA==',
};

// This can be used to run integration tests directly on device. It will throw
// an error if something cannot be decrypted, or else print info messages.
export const runIntegrationTests = async (silent: boolean = false) => {
	const log = (s: string) => {
		if (silent) return;
		// eslint-disable-next-line no-console
		console.info(s);
	};

	log('RSA Tests: Running integration tests...');

	log('RSA Tests: Decrypting and encrypting using desktop data...');
	await checkTestData(desktopData, { silent, throwOnError: true });

	log('RSA Tests: Decrypting and encrypting using mobile data...');
	await checkTestData(mobileData, { silent, throwOnError: true });

	log('RSA Tests: Decrypting and encrypting using local data...');
	const newData = await createTestData();
	await checkTestData(newData, { silent, throwOnError: true });
};
