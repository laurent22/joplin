import * as Mustache from 'mustache';
import * as fs from 'fs-extra';

const dirname = require('path').dirname;

const viewDir = `${dirname(__dirname)}/views`;

export default async function mustacheRender(path:string, view:any, partials:any = {}):Promise<string> {
	const filePath = `${viewDir}/${path}.mustache`;
	const template = await fs.readFile(filePath, 'utf8');
	return Mustache.render(template, view, partials);
}
