import * as Mustache from 'mustache';
import * as fs from 'fs-extra';
import config, { baseUrl } from '../config';

export interface RenderOptions {
	partials?: any;
	cssFiles?: string[];
	jsFiles?: string[];
}

export interface View {
	name: string;
	path: string;
	content?: any;
	partials?: string[];
	cssFiles?: string[];
	jsFiles?: string[];
}

export function isView(o: any): boolean {
	if (typeof o !== 'object' || !o) return false;
	return 'path' in o && 'name' in o;
}

class MustacheService {

	private get defaultLayoutPath(): string {
		return `${config().layoutDir}/default.mustache`;
	}

	private get defaultLayoutOptions(): any {
		return {
			baseUrl: baseUrl(),
		};
	}

	private async loadTemplateContent(path: string): Promise<string> {
		return fs.readFile(path, 'utf8');
	}

	private resolvesFilePaths(type: string, paths: string[]): string[] {
		const output: string[] = [];
		for (const path of paths) {
			output.push(`${baseUrl()}/${type}/${path}.${type}`);
		}
		return output;
	}

	public async renderView(view: View, globalParams: any = null): Promise<string> {
		const partials = view.partials || [];
		const cssFiles = this.resolvesFilePaths('css', view.cssFiles || []);
		const jsFiles = this.resolvesFilePaths('js', view.jsFiles || []);

		const partialContents: any = {};
		for (const partialName of partials) {
			const filePath = `${config().viewDir}/partials/${partialName}.mustache`;
			partialContents[partialName] = await this.loadTemplateContent(filePath);
		}

		const filePath = `${config().viewDir}/${view.path}.mustache`;

		globalParams = {
			...this.defaultLayoutOptions,
			...globalParams,
		};

		const contentHtml = Mustache.render(
			await this.loadTemplateContent(filePath),
			{
				...view.content,
				global: globalParams,
			},
			partialContents
		);

		const layoutView: any = Object.assign({}, {
			global: globalParams,
			pageName: view.name,
			contentHtml: contentHtml,
			cssFiles: cssFiles,
			jsFiles: jsFiles,
			...view.content,
		});

		return Mustache.render(await this.loadTemplateContent(this.defaultLayoutPath), layoutView, partialContents);
	}

}

const mustacheService = new MustacheService();

export default mustacheService;
