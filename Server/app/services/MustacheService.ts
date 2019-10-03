import * as Mustache from 'mustache';
import * as fs from 'fs-extra';
import config from '../config';

export interface RenderOptions {
	partials?: any,
	cssFiles?: string[],
	jsFiles?: string[],
}

class MustacheService {

	private get defaultLayoutPath():string {
		return `${config.layoutDir}/default.mustache`;
	}

	private get defaultLayoutOptions():any {
		return {
			baseUrl: config.baseUrl,
		};
	}

	private async loadTemplateContent(path:string):Promise<string> {
		return fs.readFile(path, 'utf8');
	}

	private resolvesFilePaths(type:string, paths:string[]):string[] {
		const output:string[] = [];
		for (const path of paths) {
			output.push(`${config.baseUrl}/${type}/${path}.${type}`);
		}
		return output;
	}

	async render(path:string, view:any, options:RenderOptions = null):Promise<string> {
		const partials = options && options.partials ? options.partials : {};
		const cssFiles = this.resolvesFilePaths('css', options && options.cssFiles ? options.cssFiles : []);
		const jsFiles = this.resolvesFilePaths('js', options && options.jsFiles ? options.jsFiles : []);

		const filePath = `${config.viewDir}/${path}.mustache`;
		const contentHtml = Mustache.render(await this.loadTemplateContent(filePath), view, partials);

		const layoutView:any = Object.assign({}, this.defaultLayoutOptions, {
			contentHtml: contentHtml,
			cssFiles: cssFiles,
			jsFiles: jsFiles,
		});

		return Mustache.render(await this.loadTemplateContent(this.defaultLayoutPath), layoutView);
	}

}

const mustacheService = new MustacheService();

export default mustacheService;
