
import manifestFromObject from './manifestFromObject';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function validateManifest(manifest: any): void {
	manifestFromObject(manifest);
}
