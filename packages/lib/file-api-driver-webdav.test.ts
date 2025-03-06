const { FileApiDriverWebDav } = require('./file-api-driver-webdav');

describe('file-api-driver-webdav', () => {

	it.each([
		[
			'/remote.php/dav/files/user@mail.com/Joplin/',
			'/remote.php/dav/files/user%40mail.com/Joplin',
			'',
		],
		[
			'/remote.php/dav/files/user@mail.com/Joplin/.lock',
			'/remote.php/dav/files/user%40mail.com/Joplin',
			'.lock',
		],
		[
			'/remote.php/dav/files/user@mail.com/joplin%20files/locks/',
			'/remote.php/dav/files/user%40mail.com/joplin files',
			'locks',
		],
	])('should return relative path even if encoding is different', (async (href: string, relativePath: string, result: string) => {
		const driver = new FileApiDriverWebDav();

		const baseUrl = 'https://use07.thegood.cloud/remote.php/dav/files/user%40mail.com/Joplin';

		expect(driver.hrefToRelativePath_(href, baseUrl, relativePath)).toBe(result);
	}));

});
