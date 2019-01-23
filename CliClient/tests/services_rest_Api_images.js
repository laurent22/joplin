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
	if (fileName === 'maxDim.jpg')
		return await sharp(__dirname + '/' + photo).resize(maxDim, maxDim, {fit: 'contain'}).jpeg({quality: 10}).toFile(__dirname + '/' + imagePath);
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
