import * as Mustache from 'mustache';
import * as fs from 'fs-extra';
import config from '../config';

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

export default class MustacheService {

	private viewDir_: string;
	private baseAssetUrl_: string;
	private prefersDarkEnabled_: boolean = true;

	public constructor(viewDir: string, baseAssetUrl: string) {
		this.viewDir_ = viewDir;
		this.baseAssetUrl_ = baseAssetUrl;
	}

	public get prefersDarkEnabled(): boolean {
		return this.prefersDarkEnabled_;
	}

	public set prefersDarkEnabled(v: boolean) {
		this.prefersDarkEnabled_ = v;
	}

	private get defaultLayoutPath(): string {
		return `${config().layoutDir}/default.mustache`;
	}

	private get defaultLayoutOptions(): any {
		return {
			baseUrl: config().baseUrl,
			prefersDarkEnabled: this.prefersDarkEnabled_,
		};
	}

	private async loadTemplateContent(path: string): Promise<string> {
		return fs.readFile(path, 'utf8');
	}

	private resolvesFilePaths(type: string, paths: string[]): string[] {
		const output: string[] = [];
		for (const path of paths) {
			output.push(`${this.baseAssetUrl_}/${type}/${path}.${type}`);
		}
		return output;
	}

	public async renderView(view: View, globalParams: any = null): Promise<string> {
		const partials = view.partials || [];
		const cssFiles = this.resolvesFilePaths('css', view.cssFiles || []);
		const jsFiles = this.resolvesFilePaths('js', view.jsFiles || []);

		const partialContents: any = {};
		for (const partialName of partials) {
			const filePath = `${this.viewDir_}/partials/${partialName}.mustache`;
			partialContents[partialName] = await this.loadTemplateContent(filePath);
		}

		const filePath = `${this.viewDir_}/${view.path}.mustache`;

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
