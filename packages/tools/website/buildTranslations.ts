import { rootDir } from '../tool-utils';
import { mergePotToPo } from '../utils/translation';
const { GettextExtractor, HtmlExtractors } = require('gettext-extractor');

const websiteAssetsDir = `${rootDir}/Assets/WebsiteAssets`;
const localesDir = `${websiteAssetsDir}/locales`;

const createPotFile = async (potFilePath: string) => {
	const extractor = new GettextExtractor();

	const htmlParser = extractor
		.createHtmlParser([
			HtmlExtractors.elementContent('[translate]'),
		]);

	htmlParser.parseFile(`${websiteAssetsDir}/templates/front.mustache`);
	htmlParser.parseFile(`${websiteAssetsDir}/templates/plans.mustache`);
	htmlParser.parseFile(`${websiteAssetsDir}/templates/partials/plan.mustache`);

	extractor.savePotFile(potFilePath);
};

const main = async () => {
	const potFilePath = `${websiteAssetsDir}/website.pot`;
	await createPotFile(potFilePath);
	await mergePotToPo(potFilePath, `${localesDir}/zh_CN.po`);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
