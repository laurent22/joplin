require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const markdownUtils = require('lib/markdownUtils.js');
const Api = require('lib/services/rest/Api');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const Resource = require('lib/models/Resource');
const { setupHttpServer } = require('test-utils');
const mimeUtils = require('lib/mime-utils').mime;
const { fileExtension } = require('lib/path-utils');
const sharp = require('sharp');
const { shim } = require('lib/shim');

logger = fileApi().logger()

const maxDim = Resource.IMAGE_MAX_DIMENSION;
let httpServer = null;

async function setupResizeImage(imagePath, color='#338844') {
	if (await shim.fsDriver().exists(__dirname + '/' + imagePath)) return;
	const imageFile = imagePath.split('/').pop();
	const fileName = imageFile.split('.')[0];
	if (imageFile === 'maxDim.jpg')
		return await sharp(__dirname + '/../tests/support/photo.jpg').resize(maxDim, maxDim, {fit: 'contain'}).jpeg({quality: 10}).toFile(__dirname + '/' + imagePath);
	const [width, height] = fileName.split('x').slice(0,2);
	const svgContent = '<svg><rect x="0" y="0" width="' + width +'" height="' + height + '" style="fill:' + color + '"/></svg>';
	await sharp(Buffer.from(svgContent)).jpeg({quality: 100, }).toFile(__dirname + '/' + imagePath);
}

const testImageResize = async (done, filePath) => {
	await setupResizeImage(filePath);
	const imageFile = filePath.split('/').pop();
	const fileExt = fileExtension(imageFile);
	const contentType = mimeUtils.fromFileExtension(fileExt);
	const imageUrl = httpServer.getUrl(filePath, contentType, null, imageFile);
	const bodyHtml = '<img alt="' + filePath + '" src="' + imageUrl + '"/>';
	const f = await Folder.save({ title: "mon carnet" });
	const response = await api.route('POST', 'notes', null, JSON.stringify({
		title: 'test images resize',
		parent_id: f.id,
		body_html: bodyHtml,
	}));

	const resourceIds = await Note.linkedResourceIds(response.body);
	expect(resourceIds.length).toBe(1);
	if (!resourceIds.length) return;

	const matcher = /!\[([^\]]*)\]\(:\/([^\)]*)\)/g;
	const matched = response.body.match(matcher);
	expect(matched).not.toBe(null);
	expect(matched.length).toBe(1);

	for(let i = 0; i < matched.length; ++i) {
		const groups = new RegExp(matcher).exec(matched[i]);
		logger.debug('matching', matched[i], groups);
		expect(groups).not.toBe(null);
		if (!groups) continue;
		expect(groups.length).toBeGreaterThan(2);
		if (groups.length <= 2) continue;

		const imageId = groups[2];
		expect(resourceIds.indexOf(imageId)).toBeGreaterThanOrEqual(0);

		const resource = await Resource.load(imageId);
		expect(Resource.isSupportedImageMimeType(resource.mime)).toBe(true);

		const fileExt = fileExtension(filePath);
		const contentType = mimeUtils.fromFileExtension(fileExt);
		expect(resource.mime).toBe(contentType);
		expect(resource.file_extension).toBe(fileExt);

		const imagePath = __dirname + '/' + filePath;
		const resourcePath = Resource.fullPath(resource);
		const imageMeta = await sharp(imagePath).metadata();
		const resizeNeeded = imageMeta.width > maxDim || imageMeta.height > maxDim;
		logger.debug(resizeNeeded, imagePath, resourcePath, imageMeta);
		expect(fileContentEqual(imagePath, resourcePath)).toBe(!resizeNeeded);
		if (resizeNeeded) {
			const resourceMeta = await sharp(resourcePath).metadata();
			if (imageMeta.width > imageMeta.height) {
				expect(resourceMeta.width).toBe(maxDim);
			} else {
				expect(resourceMeta.height).toBe(maxDim);
			}
			logger.debug(imageMeta, resourceMeta);
		}
	}
	done();
};

describe('services_rest_Api', function() {
	beforeEach(async (done) => {
		api = new Api();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		httpServer = await setupHttpServer();
		done();
	});

	afterEach(async (done) => {
		httpServer.destroy();
		done();
	});

	const getImagePath = (width, height) => 'support/' + width + 'x' + height + '.jpg';
	it('should not change small image photo.jpg', async (done) => {
		testImageResize(done, '../tests/support/photo.jpg');
	});
	it('should not change image smaller than maxDim.jpg', async (done) => {
		testImageResize(done, 'support/maxDim.jpg');
	});
	it('should not change image smaller than ' + getImagePath(maxDim, maxDim), async (done) => {
		testImageResize(done, getImagePath(maxDim, maxDim));
	});
	it('should resize image widther than ' + maxDim, async (done) => {
		testImageResize(done, getImagePath(maxDim + 1, 1));
	});
	it('should resize image heighter than ' + maxDim, async (done) => {
		testImageResize(done, getImagePath(1, maxDim + 1));
	});
});

const testMultipleImage = async (done) => {
	const images = [
		'../../docs/images/BadgeAndroid.png',
		'../../docs/images/BadgeWindows.png',
	];
	const fileExt = fileExtension(images[0]);
	const contentType = mimeUtils.fromFileExtension(fileExt);
	const bodyHtml = [];
	const urls = [];
	for(let i = 0; i < images.length; ++i) {
		const sleepMS = 1000 / images.length * i;
		const imageUrl = httpServer.getUrl(images[i], contentType, null, 'some.meaningless', {sleep: sleepMS});
		urls.push(imageUrl);
		bodyHtml.push('<img alt="' + images[i] + '" src="' + imageUrl + '"/>');
	}
	const f = await Folder.save({ title: "mon carnet" });
	const response = await api.route('POST', 'notes', null, JSON.stringify({
		title: 'test multiple images loading will not conflict with each other',
		parent_id: f.id,
		body_html: bodyHtml.join('<br/>\n'),
	}));

	const resourceIds = await Note.linkedResourceIds(response.body);
	expect(resourceIds.length).toBe(images.length);
	if (!resourceIds.length) return;

	const matcher = /!\[([^\]]*)\]\(:\/([^\)]*)\)/g;
	const matched = response.body.match(matcher);
	expect(matched).not.toBe(null);
	expect(matched.length).toBe(images.length);

	for(let i = 0; i < matched.length; ++i) {
		const groups = new RegExp(matcher).exec(matched[i]);
		logger.debug('matching', matched[i], groups);
		expect(groups).not.toBe(null);
		if (!groups) continue;
		expect(groups.length).toBeGreaterThan(2);
		if (groups.length <= 2) continue;

		const imageId = groups[2];
		expect(resourceIds.indexOf(imageId)).toBeGreaterThanOrEqual(0);

		const resource = await Resource.load(imageId);
		expect(Resource.isSupportedImageMimeType(resource.mime)).toBe(true);

		expect(resource.mime).toBe(contentType);
		expect(resource.file_extension).toBe(fileExt);

		const imagePath = __dirname + '/' + images[i];
		const resourcePath = Resource.fullPath(resource);
		expect(fileContentEqual(imagePath, resourcePath)).toBe(true);
	}
	done();
};


const testImageType = async (done, filePath, contentType, fileExt, mime, fileName=null, supportedImage=true, tail='some.meaningless') => {
	const imageUrl = httpServer.getUrl(filePath, contentType, fileName, tail);
	logger.debug('testImageType', filePath, contentType, fileExt, mime, fileName, supportedImage, imageUrl);
	const f = await Folder.save({ title: "mon carnet" });
	const response = await api.route('POST', 'notes', null, JSON.stringify({
		title: 'testing get image ext from Content-Type',
		parent_id: f.id,
		body_html: '<b>avatar</b><img src="' + imageUrl + '"/>',
	}));

	const resourceIds = await Note.linkedResourceIds(response.body);
	expect(resourceIds.length).toBe(1);

	if (resourceIds.length) {
		const resource = await Resource.load(resourceIds[0]);
		expect(response.body.indexOf('(:/'+resource.id+')') >= 0).toBe(true);

		expect(Resource.isSupportedImageMimeType(resource.mime)).toBe(supportedImage);
		expect(resource.mime).toBe(mime);
		expect(resource.file_extension).toBe(fileExt);
		if (fileName) expect(resource.title).toBe(fileName);
	}
	done();
};

const testImageWithContentType = (imageType, filePath, contentType, supportedImage=true) => {
	const fileName = filePath.split('/').pop();
	const ext = fileExtension(fileName);
	const mime = mimeUtils.fromFileExtension(ext);
	it(imageType + ' ' + ext + ' image with weird url tail but correct content-disposition and contentType: ' + contentType, async (done) => {
		await testImageType(done, filePath, contentType, ext, mime, fileName, supportedImage);
	});
	if (!(ext == 'svg' && contentType && contentType != 'image/svg+xml'))
	it(imageType + ' ' + ext + ' image with weird url tail but correct contentType: ' + contentType, async (done) => {
		await testImageType(done, filePath, contentType, ext, mime, null, supportedImage);
	});
	if (contentType !== mime) return;
	it(imageType + ' ' + ext + ' image with weird url tail but correct content-disposition', async (done) => {
		await testImageType(done, filePath, null, ext, mime, fileName, supportedImage);
	});
	it(imageType + ' ' + ext + ' image with correct file extension at url tail', async (done) => {
		await testImageType(done, filePath, null, ext, mime, null, supportedImage, fileName);
	});
}

describe('services_rest_Api should load correctly for', function() {

	beforeEach(async (done) => {
		api = new Api();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		httpServer = await setupHttpServer();
		done();
	});

	afterEach(async (done) => {
		httpServer.destroy();
		done();
	});

	it('multiple images without conflicting', async (done) => {
		testMultipleImage(done);
	});

	const supported = {
		'../../Assets/JoplinLetter.svg': 'image/svg+xml',
		'../../Assets/Adresse.png': 'image/png',
		'../tests/support/slow-typing-doc1.gif': 'image/gif',
		'../tests/support/webp-animated.webp': 'image/webp',
		'../tests/support/photo.jpg': 'image/jpeg',
		'../tests/support/photo.jpg': 'image/jpg',
	};
	for(let filePath in supported) if (filePath) {
		testImageWithContentType('supported', filePath, supported[filePath]);
		testImageWithContentType('supported', filePath, 'application/octet-stream');
	}

	const misleading = {
		'../../Assets/JoplinLetter.svg': 'image/jpeg',
		'../../Assets/Adresse.png': 'image/jpg',
		'../tests/support/photo.jpg': 'image/png',
		'../tests/support/slow-typing-doc1.gif': 'image/jpeg',
		'../tests/support/webp-animated.webp': 'image/png',
	};
	for(let filePath in misleading) if (filePath) {
		testImageWithContentType('misleading', filePath, misleading[filePath]);
	}

	const nonImage = {
		'../tests/support/jasmine.json': 'application/json',
		'../../Tools/PortableAppsLauncher/App/readme.txt': 'text/plain',
		// 'images/Joplin.ico': 'image/vnd.microsoft.icon',
	};
	for(let filePath in nonImage) if (filePath) {
		testImageWithContentType('unsupported', filePath, nonImage[filePath], false);
	}

});
