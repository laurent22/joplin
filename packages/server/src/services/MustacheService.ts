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
	partials?: any;
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

	public async renderView(view: View): Promise<string> {
		const partials = view.partials ? view.partials : {};
		const cssFiles = this.resolvesFilePaths('css', view.cssFiles || []);
		const jsFiles = this.resolvesFilePaths('js', view.jsFiles || []);

		const filePath = `${config().viewDir}/${view.path}.mustache`;
		const contentHtml = Mustache.render(
			await this.loadTemplateContent(filePath),
			{
				...view.content,
				global: this.defaultLayoutOptions,
			},
			partials
		);

		const layoutView: any = Object.assign({}, this.defaultLayoutOptions, {
			pageName: view.name,
			contentHtml: contentHtml,
			cssFiles: cssFiles,
			jsFiles: jsFiles,
		});

		return Mustache.render(await this.loadTemplateContent(this.defaultLayoutPath), layoutView);

		// return this.render(view.path, view.content || {}, view.options);
	}

	public async render(path: string, view: any, options: RenderOptions = null): Promise<string> {
		const partials = options && options.partials ? options.partials : {};
		const cssFiles = this.resolvesFilePaths('css', options && options.cssFiles ? options.cssFiles : []);
		const jsFiles = this.resolvesFilePaths('js', options && options.jsFiles ? options.jsFiles : []);

		const filePath = `${config().viewDir}/${path}.mustache`;
		const contentHtml = Mustache.render(await this.loadTemplateContent(filePath), { ...view, global: this.defaultLayoutOptions }, partials);

		const layoutView: any = Object.assign({}, this.defaultLayoutOptions, {
			contentHtml: contentHtml,
			cssFiles: cssFiles,
			jsFiles: jsFiles,
		});

		return Mustache.render(await this.loadTemplateContent(this.defaultLayoutPath), layoutView);
	}

}

const mustacheService = new MustacheService();

export default mustacheService;
