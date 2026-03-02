
import manifestFromObject from './manifestFromObject';

export default function validateManifest(manifest: unknown): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- manifestFromObject takes any
	manifestFromObject(manifest as any);
}
