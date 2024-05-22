import { ResourceEntity } from '../database/types';

export default class ResourceTracker {
	private pathToResource_: Map<string, ResourceEntity> = new Map();
	private idToPath_: Map<string, string> = new Map();
	public constructor() {}

	public addRemote(path: string, resource: ResourceEntity) {
		this.pathToResource_.set(path, resource);
		this.idToPath_.set(resource.id, path); // TODO: Handle case where id is undefined.
	}

	public pathToId(path: string) {
		return this.pathToResource_.get(path);
	}

	public idToPath(id: string) {
		return this.idToPath_.get(id);
	}
}
