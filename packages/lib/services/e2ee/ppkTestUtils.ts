import { rsa } from './ppk';

interface TestData {
	publicKey: string;
	privateKey: string;
	keySize: number;
	plaintext: string;
	ciphertext: string;
}

// This is convenient to quickly generate some data to verify for example that
// react-native-rsa can decrypt data from node-rsa and vice-versa.
export async function createTestData() {
	const plaintext = 'just testing';
	const keySize = 2048;
	const keyPair = await rsa().generateKeyPair(keySize);
	const ciphertext = await rsa().encrypt(plaintext, keyPair);

	return {
		publicKey: rsa().publicKey(keyPair),
		privateKey: rsa().privateKey(keyPair),
		keySize,
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
	testLabel?: string;
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

	const keyPair = await rsa().loadKeys(data.publicKey, data.privateKey, data.keySize);
	try {
		const decrypted = await rsa().decrypt(data.ciphertext, keyPair);
		if (decrypted !== data.plaintext) {
			messages.push('RSA Tests: Data could not be decrypted');
			messages.push('RSA Tests: Expected:', data.plaintext);
			messages.push('RSA Tests: Got:', decrypted);
			hasError = true;
		} else {
			messages.push('RSA Tests: Data could be decrypted');
		}
	} catch (error) {
		hasError = true;
		messages.push(`RSA Tests: Failed to decrypt data: Error: ${error}`);
	}

	// Then check that the public key can be used to encrypt new data, and then
	// decrypt it with the private key.

	try {
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
	} catch (error) {
		hasError = true;
		messages.push(`RSA Tests: Failed encrypt/decrypt of new data: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing RSA failed${label}: \n${messages.join('\n')}`);
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

// cSpell:disable

// Data generated on mobile using react-native-rsa-native
const mobileData = {
	'publicKey': '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlEVSnwMpmGC+YaRw3B37BP1IBth02OFCrlZjlkn14OijnmQaOKGxhJtthvlVVEOEc50D+MMKZ1mJleER4FnD3CoGHaVZmZRa3wnuTblctF/in0mgywFJ6HlEXngUrWt2TkCnkwg4nP0IKlQ4URBxWGllVbWUgqUs5uAtV4mkrx+Ke68j+suoN8w5BF9WnYJCclDCplUOFx77llw1Z/7O8UjkgbfYKOnwMEpxlO1SVutNQNgD4BOtGn73ai0qjHKq5as8SKJb/ch+uAX95bJHlOOvBrHw718gcbnxkn6PEN3vl4/HbmHFj/V4zxG8ZF82+oTOh6m/HGdPPLpF8e98dQIDAQAB\n-----END PUBLIC KEY-----',
	'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAlEVSnwMpmGC+YaRw3B37BP1IBth02OFCrlZjlkn14OijnmQaOKGxhJtthvlVVEOEc50D+MMKZ1mJleER4FnD3CoGHaVZmZRa3wnuTblctF/in0mgywFJ6HlEXngUrWt2TkCnkwg4nP0IKlQ4URBxWGllVbWUgqUs5uAtV4mkrx+Ke68j+suoN8w5BF9WnYJCclDCplUOFx77llw1Z/7O8UjkgbfYKOnwMEpxlO1SVutNQNgD4BOtGn73ai0qjHKq5as8SKJb/ch+uAX95bJHlOOvBrHw718gcbnxkn6PEN3vl4/HbmHFj/V4zxG8ZF82+oTOh6m/HGdPPLpF8e98dQIDAQABAoIBAAl/FScdFz1suNTdKONYQjsUE9hoZbd8Wf57hv5Zt1dT3yLma22EIbAKGm5CKu5uMp4LCPWWXGS5LeA9HZ1+clZ4FJMyg3YcM+PEKZCt1huxZnzoRNWru/WZSsE4NK7UyquBZZo7tRCM/khjw4WhpXjRq01dh2kEtkcFRbItHTCgHgQxf3q+XoflVD9pZVj+EylP8vSodxtP1WkWb7fYOybestlvi8vwNQLoRO5PgFtjC0nOvwGnk6120XpWhP95EMy53iOygG9wfw7pxYTfSPEIQR53EGgiv8jc4WPYKc9SZea/bE0Rkt46/jMo6SpTrVNj5WwoCPwB012+edhlmaECgYEA0Q90zuD7cvjB16iDjdsvyZ0gBxozfgDsVNgPRNf/Rv3ol/Ycn/NcBi8XQKdw8NJXoPJbVbzzRvIbGqZLLgzOngjFJFiDW+7M/W2cwD1HFvDjEGYqtZqbLDWZYG0pX75kAB0YyI4ncelhr6nZMs/RMBIw9DGpoBMmP5CvXfgX6XECgYEAtY/Ava6DUKT93m6Sw9NnWesb60uEttvOCXVWQJfOzSLdbzWOw4IgG2YHE1+w+TQbumdt5tzczacvkW9C2KsPllBHeFtsDSTpe6ecuCzl6Ryv5FLg5JfQIErYje4ifmzm+DirMu4kEdsY1jfYnOYyoEo7OZEKRGttUPTH/wHGIUUCgYB3Y/9OQjf3cc6pzWfLtHg3CI+I3tK3S+mrjnQx2bTEoy6Y0gmI4x8TvQLnfnhGX6mBlcbJUQ4R3yPRdVSL6O56XAHR/uaNsvPIazfQpW4a0Nirvdz4N2IUvktoQQ8WyZEsa3GC34PxTtnlyvbqSLprXIgufMolS6pVNNihrpRhUQKBgC2d6p09xXxzl91VBsbwzJzI94DMvpF69G9n7b3Y5nqf8ebJHA9/GDYKEmkJt9tE/lp9Nh21DD0XbloqDC+H+yiXDv3sal97ELaizDtx/GnvbTn+oMaOZhpW88XlOQFutzFSe6EWODXMSJc5/NCe/cVMIUk7acr6+sJGXiFx/qfJAoGBAKVL/6KDBJqMEyqMs2Y0NpMS2Ia163RPJTiBJoIJYw3KOonaDkjk+7dAeYjGlKjLTWF2yckPbYVXmu9MrREGtIpb5oii5J2lFM5oDr40iZIZ5nBiXQfm/B7/IkpJ7IXOsYeiK+UDKSWW71GFeYtICfKlowolm0jBBS+M8XJjplz2\n-----END RSA PRIVATE KEY-----',
	'plaintext': 'just testing',
	'keySize': 2048,
	'ciphertext': 'K+saH0/1Ltnc8GFqy1gKDpIY2o4OVkNFCQGFIp1574kkjLEKIgQpgc/kOdc7EO5m\r\nAN7TKh2zGrvcB9BqMOjsQNeausQzAm+b5fYWVyRHfQ5kf6+ojUO+LMRPxKqNO58m\r\nPw5/6R7zACJn1W9cHolY8+YKAeL+guQmCoD50nEgyZc5+HMRKGZpu+Vh7y562hYu\r\n39KPCcLFzWj7yi+JtbD4bFVcgPLg8T2PXCOqj+fVkAXXdkt8PnHfgf4lbfYojZ1d\r\nge7C1hx4aVrfT7vj2saXU/RrV9MlBDtAFZDynWa+LfMmt56TWCO6yWm5KpckGU/E\r\nfEs7l00aSskIai0ghZSIvQ==',
};

// Data generated on desktop using node-rsa
const desktopData: Record<string, TestData> = {
	shortData: {
		'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAvLb8Lk0UBFEQ2UJsVMgKdbPYExhYqa87diBQiFBJglgNuZVi8/HX\nvpCVcH7BhdQKkA9Mh23SpNcYHR9JrzUTrn9Q21t1uj2J60+bfq1s0BA1wkS/xBPN\nrrLw2yCPpkZzNH8HcLx/MtMaOnOVfl5KqftXROzn+Vo3rrxNprd2ETLAxr+CC6SE\nTJiiP8ovUfH+TKZ3P2nkSyBy4oY24h4HA+wVnj12DspE8CMOXCyBUxlG2ki2c/sK\nDSDla3oEjB8QdpBKhIXD/Bb4MpLHfaby7O/eYjrteB8g6JU01JDsnQoomLe4FdCU\nnYK5sFNUQ89e05lMa3yxZWV3mXAVUi/mFwIDAQAB\n-----END RSA PUBLIC KEY-----',
		'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAvLb8Lk0UBFEQ2UJsVMgKdbPYExhYqa87diBQiFBJglgNuZVi\n8/HXvpCVcH7BhdQKkA9Mh23SpNcYHR9JrzUTrn9Q21t1uj2J60+bfq1s0BA1wkS/\nxBPNrrLw2yCPpkZzNH8HcLx/MtMaOnOVfl5KqftXROzn+Vo3rrxNprd2ETLAxr+C\nC6SETJiiP8ovUfH+TKZ3P2nkSyBy4oY24h4HA+wVnj12DspE8CMOXCyBUxlG2ki2\nc/sKDSDla3oEjB8QdpBKhIXD/Bb4MpLHfaby7O/eYjrteB8g6JU01JDsnQoomLe4\nFdCUnYK5sFNUQ89e05lMa3yxZWV3mXAVUi/mFwIDAQABAoIBAQCMIm2djEsi8XfL\nfZGoW2u4/7WiaF/ekWtcSp7Cuqv7iJuYhiAW+i21KvRttxLJ6C130ISJxLm5Aqi7\nZ3J2ErnsyEoouf/wLqZuAI19QhcdYgwpmJe2aOZBpktIzSMe3A3Mm8/QnYjvGufN\nI+uNDUPwed3SJwITnjTfIqGe/XlFRtvCIurp7vDbh4kTASpg3M8kjXiznVMncC4D\nWNg0vRnj53zfiwRkxZwMubYa25qR2Kt/S703QJVh/ctccbuZ6GyRbtgBlGuxuwX8\n1aAMBScMBMFtU+Xpb55EgsFu6Snzs6yrFKXMybR6ea31CtzBZvjZdGKO1Yxh2Dlf\n7f1PWg9hAoGBAPpLMPXFIsUtq6iwh1slDXZ+IgIIYgs/JkYvDROFUbp9qrnGcQBi\nIC9Dnf7fYwVnYQ18+gz2Qcjn9e+5Y/4aBPW2PjAYurdBMNGlEEKMbl3Ocad9h8mL\nI2MRBFOpwZaVhm8PJBZkhhfkNouh13KRyr9vS4egTdEBOZGR43GSrZ9fAoGBAMEE\nZVqaTg3jAh5GJBcxKGjz77BN0X5wRkYO9OU4DYuBq+sz+JVytLTMMDTtdxbJy11b\nH3wOuz1SugtouuJZ4hmwfXuj+2AFh28tiBcz6nik2pQYgdgowP7eqXor4T+Nd0mP\nzEqa7+W62pNAVlA0DiR8obPmzKNwBm2OZXxR6wxJAoGAC6T95SFDydqjFtkHoxTp\nOG8L0/5h2VYZyMAdop/cOonoLHZwAW2PQ8OokRgBelnh6Qe8dmfqjZdFGN8OKN87\nBddxszkjTq1IwSglxoLUC6c0IG+1ponDnrNG+UF3kTLpqzcQHb6Vgn0KkJp59ImV\n3iwmXmv10th0vjIEW99QFo8CgYEAkqF/SdwtbdlF06/fXQsIMusV7K7Bdrdee3yD\nSNtTVub0ruK1dvtEEpGIEb1QmixE5TADdCBQ2B5Pnbk7OBemb3OncFU7809f+vLx\nDwdumaZLMvSHN6qGK1kGEPziyn/y3hxyyz52/uP7hp/6skVJdSiFQ4ETdxn0mCf0\nKwSkdpkCgYBDMXv2N3eF2IElZkN+8rQYHqWck1HqTcSnlrHS0i0uPQduQa+K/O+G\nVE2S8htp4/D0Gd3EwuDBIT3vUvnx7YBuMX1fXwU0m7oKKOyQqhxfrt9t7BEh2j5r\n5pvRU7dTKVbua78w1sQQMtYnWUyukBlaF/IpHPi5hwCjmDQR1EJY4w==\n-----END RSA PRIVATE KEY-----',
		'keySize': 2048,
		'plaintext': 'just testing',
		'ciphertext': 'PRqiQjxnQMukoYPA9XtlGcgAjwuDJd24GtJ3iO2qhh0HnbPnx3c8ZaGWJyV1ejZCwIWv509js7sCTHtXqeGkZr//Db6oOIyi77VzRwvzPxReHPefF0rX62uMh+zTmQW7KSrFeAvtnpWiDcyynUtwycgrZcQCHZoEmSSyc3cyj09HgqEoSQb0BOc8daR0aXwOpgXsB8ypf3+m23U1gZmIyl0glymTN9h1jopV9dRtw5ufcc4ve/hHKp0gbaT2OaRKOLr6AXmbDGwkF5bsvjV+v4tTkj96OUjoG9qUMQh/JYRMl7mxJriUB3Jc6WHEKRVPQYAIZODfEOy3rkHwWAcYjA==',
	},

	// Desktop's node-rsa supports ECB-mode long data encryption. For now, mobile only needs to support decrypting this data.
	longData: {
		'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAieWC6SdHvTIbaqfs1fA8sFJKOEfXKE1Sm44AhwfGa7LjCaO0bZo2\n56NiV2ljGRAsVMUozmlwkMNOnhi1rBZXRIBb02xQUgIQWnSMRW44EUiFDNY6hQo0\nsJISDbi7Gq6aEEr952AcH7pacuilqyPLW1EiW0dHxksZXVlDjGwGIaBTzNDPIMbO\nJ1hBYWsZzzVsHq8YBnFG3lu5cL6ckbXUpw188k/HixQIPrqyofANDW0GP5AKxDd/\n6Kv+WfFgEhAuEbpNpavPFz4a3QCX2lfFpw3QBuPk1Ye+XByuDdwdN31KV07Fun6E\nyfvtCite0gJEcpjUS6iCPSAvf41ViRUXRwIDAQAB\n-----END RSA PUBLIC KEY-----',
		'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAieWC6SdHvTIbaqfs1fA8sFJKOEfXKE1Sm44AhwfGa7LjCaO0\nbZo256NiV2ljGRAsVMUozmlwkMNOnhi1rBZXRIBb02xQUgIQWnSMRW44EUiFDNY6\nhQo0sJISDbi7Gq6aEEr952AcH7pacuilqyPLW1EiW0dHxksZXVlDjGwGIaBTzNDP\nIMbOJ1hBYWsZzzVsHq8YBnFG3lu5cL6ckbXUpw188k/HixQIPrqyofANDW0GP5AK\nxDd/6Kv+WfFgEhAuEbpNpavPFz4a3QCX2lfFpw3QBuPk1Ye+XByuDdwdN31KV07F\nun6EyfvtCite0gJEcpjUS6iCPSAvf41ViRUXRwIDAQABAoIBAET+4BR2ge+JHays\n3tRggo0ab2Zfk6jnn1iToXHukvoaJH0TOtjIG4ak+jSQV3QX4oZ7q6IzoY3dGv4B\nkQzMlNeCfe94N2wA+lu4CuNGdak4JtI4cklUxO4/9+aDsqJ0EEPsscPOE+RQIqdx\n/kp1+27yVoVjUedGdid93U1qU1sJF9HcshwwJeieyhx+4qJEDsoN625UkjasItuS\npYPEK1L326HiENjI0u/biR/vzCvivkElylOtPcdVj42NcksyHAzNRoYT278ZyddA\nf1PNkfuZs1nK91JbEuE35YghBc8ZuN+ihyd2qmi2JDyEv4t8Dm6aY5VU8Vf4FZTc\nRS3/dXkCgYEAyQkpgg/tPPAuEVTnwPlMhVkjIvHQ8p4LFCoVo/WvYtH1RI5UArVK\nElOiwG5+m7xHfzDOSTK1kcvLOXfvRrzPv9spipAGzNHM8JqDAhdbsL19Sy/1G0C9\ntU1xx22Llz8TBD5uLLcA4Qcf5qgO3V93aVn8QarjV0iEbRb4wNxwvJUCgYEAr5kf\n6XL7avCBfOYiQAYQ3Xr976EbFRssnrBs9TfPFZlklXfG0OPsFFhDYm5VBDVir8mo\nFTuKPbVsrffmKqjamgTfCl4hOE3QlzrUSQYsNrEnSdiL3SCiHcJdDxz9AxmvO8IF\nZtKGzF7O5th1RV7fMBwEUZ0CyogcZjFC0Uk28WsCgYBhhcBNB8zeMuUmIzoJsuYc\nChGxcf0atPBK5993mkdqeM+yYhj+91LncQsSrodcpQlJ+jMX7zGFeIctabD5b76Y\nI4kTXqrt0RjJ3yqOaSZhpoqRXsJYZh+hQ+BeDhYZWM+wz1hC+MPEZeBj1ELhwN38\njVqBwJRoUxVqlio15LoLwQKBgHO3gOQitbQ/UdWxApkWZj7OMlGb5XD/O2RH90WR\nxZICR9qH2CkISicOEznmY3gmhiY5yd5UIkGQMVJjrvYl2AjvdNwsM9Aa138RcZu9\nyZ0xGSb84Q6T1sGtuA2hmMpWPrgun8imq9Y6FDbkJkPUxVe63s25noFBORXPGK06\nhk6JAoGBAKC/RNHfs9Fd8vA2fHujDRwzaTgKYkBTwDx4uLIUXCUxloQfILryeQI7\n9g1Xfh/ru2TpkKd9i2BZXYNCKBm0OUosH79kkqMMDZLpkYQ2rv+RZgZeCwVjpbJR\n/8NdeOUD9zrIxblqnYBQwoeF5syXSaM0P9VrsYsygqvN2Xp1mhdW\n-----END RSA PRIVATE KEY-----',
		'keySize': 2048,
		'plaintext': 'testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ testing... ⌨️ ',
		'ciphertext': 'dfZDm+u0yV4jZpx9Q456bF2YDL6IMCsCeq4wmlpFLDsWwjY119q6pZVKMGj1ZG4/u13nlxhBxnTV69Zu4w7fNNefCdBl+ZdsIWrfX7zUON98yzjwFflWDX/vydztatHPA9qlwG15V68HU53q6V3hgKnm3Jv1azuwMkH3QupDd1df2JfkmQVVe9qR9Me6Bv+NSFt6Mccimaf2K8lqw83zKnLIJz1LoP/Koavzd5Xejp66E8Cv8WdAwgHDuWnWHyiaYFbW5uL65VyGTQFO4vQn7SJj8QE9PqvknJ5XPRVXWnjEbquMMdo8o48/M1l17KwbaES95vIOJKKO1EuUK7kT9l6bncSa4PlmzW4Bb5OcjzKBy8ovN+lf2a1B/z+Ob3Os4pv5FW7X9p1YZg1XluqolOqG3AuAbTmexMcuhkI6p3nC7FW472Wa2XbrIeDM0pWOxpKoDWDMT9vMbUVv2ZRVSj3Gk3KYwv3av/kkoNcmzRlRKgYG+zM1hYBVy+eqs55HHvnZYvx6f+PtXfPGMqxtxs2eXRJdmLuLyPIlhrLk+px9Z1QplxOovjgt5PtrJb9d/vNEjg1DIdpIpruEZQ6LbhwP94vSpGE8wbVmszakrQZpCsUn0vKhGDVBvAr4DkKET8PDfxclrlflN4GnWDN5Qal3P8gnMTAJ9NnAPCQydyxpeUDaVXMT8Ir7orrJzUCoFzltUkw/2deTPbnsM9GOAWFtjgUWg9YO7w23pUy1XYl1/eHSucOXh8Z8jLSS7lOk08X0NCYjDdeAzrlJANckTa5SJ9wWsUBUwIffJeK0oMk2qze1vu+oEb4VVbWxUEr/v8aLJSA5nvSIYknrLbHtqh7eoU0q5tfvhDJBxOQ8Xnuik+0p00SWCwoGJYM8RyWzPTUJ5QqAHA4b3gMPDHMXKTD1lyPJS7nknujaDb3+qFPqeKXJqhdlxfUdvNeuCVfEiqQFgy9Dxz0icpZdITuTNsJFn+hA1ni2rj/SldntxKizfPnTVxaMBLPCbzcX4BjZeHeL+DQqYsOM645/I8BPg3e6MsPbDOwkPq84VqorNsdNRyuh4rcdpLr5rHlyTFIGVzrJRvaiCQMuGW9pXN5vtsYgHpVYgH904iLOBxbu3dSMCSwSY5ciDM9M7qPD0trrLTiMTZLkgcmH6RQY9y/RpYOxbp4UbspOc5xNxnsdh341zuN5s8/bGS0EOMqkPNCtQ4B0EQg8/xIZqHdJMI0infNdkjmiMCQHJnDCdvImZPvrJsblXfGNqrWYxoyH68cXLl9Z4AE74vyexeT47yMEp9UG17W1/jBSlWUEj7uQBklhA/f6yWIYf4Mx8jbHon0+SVa+6ZPRe2OVZya7hnLJRg==',
	},

	blockAlignedData: {
		'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAqyK7vgml7lpthwd6mazPwlSe74LEUKC58sSn/1krP9YT3YNCvgoX\nKkIgtkQFFD2T7UtX/VhS2GkEeIIch/5+cDOZAFmixbDddqxIXfuvcG2z3fIdFfv2\nTYbO5Ke8j3VUO1QTl6xN3m1qbQqZ+JEhCRMNZTBaDwxGIo1aTGlm32LB0WOjPXAi\n7CBRObp7qBQGM8K+spHQtDOssTsVwb8NpxwshLKaYw8GEK+lqW3Qqf3URz0IAfkN\nSANMtOWvFyDVRavRFVqQ1liPBFcswnHt1rBNz+tS7HWVwNI94EDA3rPdmI7WDjpb\nuklLjvWt1ib6c3X5DQG4PyWOCbIb4jDHFQIDAQAB\n-----END RSA PUBLIC KEY-----',
		'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEAqyK7vgml7lpthwd6mazPwlSe74LEUKC58sSn/1krP9YT3YNC\nvgoXKkIgtkQFFD2T7UtX/VhS2GkEeIIch/5+cDOZAFmixbDddqxIXfuvcG2z3fId\nFfv2TYbO5Ke8j3VUO1QTl6xN3m1qbQqZ+JEhCRMNZTBaDwxGIo1aTGlm32LB0WOj\nPXAi7CBRObp7qBQGM8K+spHQtDOssTsVwb8NpxwshLKaYw8GEK+lqW3Qqf3URz0I\nAfkNSANMtOWvFyDVRavRFVqQ1liPBFcswnHt1rBNz+tS7HWVwNI94EDA3rPdmI7W\nDjpbuklLjvWt1ib6c3X5DQG4PyWOCbIb4jDHFQIDAQABAoIBAGLqWImnGfmC2vvJ\nHtvkPtGcB6F4e+/+dnwTnubAq3biTekjDVi6jFkoj6/J8QWZ8f6eJeWRP5FGYgcl\nbUhNmNdRe4XwSVzqtZb6TXnFF8psHiKS5qzmTZ7R5JPVP+/LaTxBhHGObhO6OmF8\nVzKM8ANGt99c6zD3bzJZcW/pHETQ5R4/Y+H/YCsi1DbMGRMJonVRLySibev7C9iO\nriMIbn6s1r5VN05O7lwDhZ29pSpCg/QuTiVhXEIKuxI2ig9mI0LwP4stDVSGdUdY\n5KnSA0Gmfn3XiUjHkG9Bmd8WGacWDrtrsViZ4iLowvWisrOON95blZLzgRNbK1MO\nVFQCZqECgYEA5ekxfZKrQdCr0AcfY4MO6ks4JtB9evwm8syaZczU2bTDSAFd6EQK\nc1davmZL43+53qMz8oJDK/q8lwJF4K+UtsQ25GKDeeysiDMtKbp0cvkmRq94x4AA\nXyBIMXgntJh2v/PYIl/GrHfOKIjLwu20CMWrz6dJ2Cod8MI4GkLGwb8CgYEAvo4l\nez5KrT3SCtZeN6utwZJxzRkpWVohppE93U5ZTBDfJ5Y6HI1gnXaMTzi626YGAzhS\nYYtIqCG0znr64LFKkubAb/JIMOhZS1U0T61+VnReuG6jsi+8klSCauiOvlS68N4B\ntmjm4S8NSklUMcy1CwEweyd7S3bAXXCb9q+IxCsCgYEAo3iJLeYJSsSaRVGrKdBX\n3JMbG84GSlnbP6vm5BceCKWUbDA8mxc17wjfhp2pu9pnSDv2hanFJRIk4aJGGRn+\nvW0KMp0xKpHzouvwYskmX1Fzu7KsR/1lRj3n1vS+FpSJarZwqRA8bQjKVtvdNX5a\nEhqqrP0fbkmT/Em8Jj/wnnUCgYEApuqe3HD5Ov1/Aq06hKtmnbwo4U6cEL/J4D0z\noqphwCa7QtLt/lq8+dGBIFgCHis08xcf2oAGWfiEh6XkInRKbZmhka36HJU6uqld\nFDpWA2cWHZoU3B3Coa9TOlCR0RkpU5o0h9MmArSTgLHxBVpab9RP4mD4OGdCI9dj\nVtf2BlcCgYEAx46GS+bed52A02fw4nrbcIJhau+9YlW4QQ7NAcS6axfeaL4FfE2h\no+SXUlbfSuRlfrXkB40AxNE/x9vjXiewqBRPEh/6QtDBoT1vXWfEzYAwfrp/k7+L\nrV5+nqGRvFNctI4jwDDiXqiFAgVJ9cwLsaFBGlKPIbN97RQ3Wd7m98E=\n-----END RSA PRIVATE KEY-----',
		'plaintext': 'Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... Test... ',
		'keySize': 2048,
		'ciphertext': 'lduLgN1JauTu5PORZcWxwjG36WqeyAJn9Ahqm2289eONrFDl24oUEkZoU8JNqoTKt1HttkO5SNl8d3FO+nM00TzlXoy9yiGInjvvVHrANOfYhX7pQmPQp0JMJq68XuJJ1LfbeC4gTU5083Cpgr6EeygLxaasrpiqFwx6jxO523GtybmE+YBuv2GdX3EwGH0hNzlsDx9E5t0/3/TC/G2zNJaVihTGJXhy3gySrXIIx30vIpc1DR7+R+s0rquqpN3r79UI93i3bSSrZSR9PPhlaNNrWZJrR3Szg5xn5KTx/JiZtGldqBM26itUy+nOyd8JZf1HQmBlp5+YUHyx3FpbJWpkLuNCiRN3XMhgJtLL5Fd62GjZAahrEuKyF5q5c+8G3P2t7JLqJiBNrUzHFAdzAhw+RbKq5ov4WqzlC1t8o/j0cUt/mXmNyjR1xI+WODt3lksVsfHPg9uYYR8H0KhStfTebleBi5NZmkZwD5BUZo+wLTB127trY0xCWcv8m/mANO2qd66uHnD6lUsiRK+BkY8SwUrfWeHbT35sv43/OzrLsYBeO04UpNfX9LAfVSwcsmehp5F4WvD1ah1JsGCQTwyUkbIKOQPFwy6JQTxTA8gtiP+Baccd8GPTQBnKCkCQfYE5PAcrSQq8gnXKbpdJVBiJJSZKqyHaHeDNpqqInrqA91MtHxsflAexrPa/hjHIUrlezO1kxY9KQc7VM4WqNo4soDUNBMhOpDXptWfVi7Iy5nEAiA7f34SdbUWHtZ8wfyfKd4XmhFpriopWVlCmKUzY+uNEMEHizeh/HllHn6v1R98OEJmmmQ2ai/LVlKgQ4DJHom8W4BuAwZgOfeaR0LmyUkefKJQFSyOM4xgMVVmUS1U0Lqzv2yWY2jCCcQBFP16hoqcRcw1tl4/mD7hbqIezMKmcZZrla10vK3y6o5zSrk+tGbK8ROUFm4KftJQ808dEU0s4TPLq92k2R2+N9R0NCppagP4v9YwZEEKWX4w9NK8LzjR7ACGh25jftgJC',
	},

	shortKey: {
		'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBANQZjY+Kxuj8Dw45GasKumwyOMCrXc+aKKK0eO1QfeNDSwpad6MZf+dU\nObRaL+0lRoyR+01GFy/UU+zLYW0kzqE8iHm9HALNHTj/mud9nuoCCG8ZRR7IVcmQ\nfhIBUHiXQcosW1nMAe8HJNvUwlVO5Pnc7uUj9l9j6EDS6CGAAtvfAgMBAAE=\n-----END RSA PUBLIC KEY-----',
		'privateKey': '-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQDUGY2Pisbo/A8OORmrCrpsMjjAq13PmiiitHjtUH3jQ0sKWnej\nGX/nVDm0Wi/tJUaMkftNRhcv1FPsy2FtJM6hPIh5vRwCzR04/5rnfZ7qAghvGUUe\nyFXJkH4SAVB4l0HKLFtZzAHvByTb1MJVTuT53O7lI/ZfY+hA0ughgALb3wIDAQAB\nAoGADfIEKbzxKR5xivjcJC/XZAfFTX229FBpfZEqJkhVjpy9EVgzZ4jkrPwPszj+\nz7PUuKdcg48pNR7bycTxifCSmU6UgWZJMyHcoObXOxOO84BHcBIwkQoXhixzIOeu\nWYAVscWfCbOgwDu/Xoh5hz7bJb1PMrs86+S5qm1/mbNwM3kCQQD+Ngq7XZb8DAEW\nDsBQPh0SdqUHBscNVFDqC9I0J2tuOD1N8OSMduy9U2RZh8ZJsxnvgvjNOBoIyXXL\n1Ey/fxCrAkEA1Zel6h9LfmHLC1gdRKpY5LN0Tfj/OqVAF8icbwn4CzOfFs7IgJIW\nR7P7gDcwW0HhU34Zs9w0vfI54MGJHr7pnQJAI1wpCf7urYiN7h+HKKI7MQJH2j5b\nGcOMrcGPL6n8C4zPGjRT1iYEsCEVaE62ijHbfbFeIk2XcXl0ZTHWqxxlmQJBAIt6\n7Wj3KMiOOhbdYreNemFW4xNsD9gPQ8yEP8uvOeCuxCwTuxFi1NPcL9epspVVbzyj\ns0sl+Pc1cCBaoh2G1G0CQBSonDMUC44O500cEBP8tbuflE1QHGNTOYiQMOOda3GD\na1LpWX5rWVpYLc8/kiDqFGNDR1Ll99uxkfp2MJV5Q7I=\n-----END RSA PRIVATE KEY-----',
		'keySize': 1024,
		'plaintext': 'a test',
		'ciphertext': 'T+uRI83CG4eS9SbM+I82MycF0xtHTxXQM4SrvTrQKqo1330+qYiU2Hvu0hNDqkx28RBoamKA2rKOUcYc5v6oGac3lt3GLKdy/itZFNkIZualB0x2V5ipBnWn+13/fuJ6Zhu2qJmVQ2y0pfO2Rh4doQ64it9h/2jWT5EeDjccXbg=',
	},
};

// cSpell:enable

// This can be used to run integration tests directly on device. It will throw
// an error if something cannot be decrypted, or else print info messages.
export const runIntegrationTests = async (silent = false) => {
	const log = (s: string) => {
		if (silent) return;
		// eslint-disable-next-line no-console
		console.info(s);
	};

	log('RSA Tests: Running integration tests...');

	log('RSA Tests: Decrypting and encrypting using desktop data...');
	for (const testLabel in desktopData) {
		log(`RSA Tests: Running desktop test data case ${testLabel}...`);
		await checkTestData(desktopData[testLabel], { silent, testLabel, throwOnError: true });
	}

	log('RSA Tests: Decrypting and encrypting using mobile data...');
	await checkTestData(mobileData, { silent, testLabel: 'mobile data', throwOnError: true });

	log('RSA Tests: Decrypting and encrypting using local data...');
	const newData = await createTestData();
	await checkTestData(newData, { silent, throwOnError: true });
};
