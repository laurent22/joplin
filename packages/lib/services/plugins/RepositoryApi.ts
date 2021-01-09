import shim from '../../shim';
import { PluginManifest } from './utils/types';
const md5 = require('md5');

export default class RepositoryApi {

	// For now, it's assumed that the baseUrl is a GitHub repo URL, such as
	// https://github.com/joplin/plugins
	//
	// Later on, other repo types could be supported.
	private baseUrl_: string;
	private tempDir_: string;
	private manifests_: PluginManifest[] = null;

	public constructor(baseUrl: string, tempDir: string) {
		this.baseUrl_ = baseUrl;
		this.tempDir_ = tempDir;
	}

	private get contentBaseUrl(): string {
		return `${this.baseUrl_.replace(/github\.com/, 'raw.githubusercontent.com')}/master`;
	}

	private fileUrl(relativePath: string): string {
		return `${this.contentBaseUrl}/${relativePath}`;
	}

	private async fetchText(path: string): Promise<string> {
		return shim.fetchText(this.fileUrl(path));
	}

	public async search(query: string): Promise<PluginManifest[]> {
		query = query.toLowerCase().trim();

		const manifests = await this.manifests();
		const output: PluginManifest[] = [];

		for (const manifest of manifests) {
			for (const field of ['name', 'description']) {
				const v = (manifest as any)[field];
				if (!v) continue;

				if (v.toLowerCase().indexOf(query) >= 0) {
					output.push(manifest);
					break;
				}
			}
		}

		return output;
	}

	// Returns a temporary path, where the plugin has been downloaded to. Temp
	// file should be deleted by caller.
	public async downloadPlugin(pluginId: string): Promise<string> {
		const manifests = await this.manifests();
		const manifest = manifests.find(m => m.id === pluginId);
		if (!manifest) throw new Error(`No manifest for plugin ID "${pluginId}"`);

		const fileUrl = this.fileUrl(`plugins/${manifest.id}/plugin.jpl`);
		const hash = md5(Date.now() + Math.random());
		const targetPath = `${this.tempDir_}/${hash}_${manifest.id}.jpl`;
		const response = await shim.fetchBlob(fileUrl, {
			path: targetPath,
		});

		if (!response.ok) throw new Error(`Could not download plugin "${pluginId}" from "${fileUrl}"`);
		return targetPath;
	}

	private async manifests(): Promise<PluginManifest[]> {
		if (this.manifests_) return this.manifests_;
		const manifestsText = await this.fetchText('manifests.json');
		try {
			const manifests = JSON.parse(manifestsText);
			if (!manifests) throw new Error('Invalid or missing JSON');
			this.manifests_ = Object.keys(manifests).map(id => {
				return manifests[id];
			});
			return this.manifests_;
		} catch (error) {
			throw new Error(`Could not parse JSON: ${error.message}`);
		}
	}

}
