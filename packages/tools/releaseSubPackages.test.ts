import { bumpVersions, PackageJson, sortByDependencies } from './releaseSubPackages';

const toPackages = (manifests: PackageJson[]) => manifests.map(manifest => ({ dir: '', manifest }));

describe('releaseSubPackages', () => {

	test('should bump all versions and update ranges between public packages', () => {
		const result = bumpVersions([
			{ name: 'utils', version: '3.7.3' },
			{ name: 'fork', version: '4.1.66' },
			{
				name: 'lib',
				version: '3.7.3',
				dependencies: { 'utils': '^3.7.3', 'fork': '~4.1.60', 'external': '^3.7.3' },
				devDependencies: { 'utils': '~3.7', 'other': '1.0.0' },
			},
		]);

		expect(result.map(m => m.version)).toEqual(['3.7.4', '4.1.67', '3.7.4']);
		expect(result[2].dependencies).toEqual({ 'utils': '^3.7.4', 'fork': '~4.1.67', 'external': '^3.7.3' });
		expect(result[2].devDependencies).toEqual({ 'utils': '~3.7', 'other': '1.0.0' });
	});

	test('should sort packages so that dependencies come first', () => {
		const result = sortByDependencies(toPackages([
			{ name: 'tools', version: '1.0.0', dependencies: { 'lib': '^1.0.0' } },
			{ name: 'lib', version: '1.0.0', dependencies: { 'utils': '^1.0.0' } },
			{ name: 'utils', version: '1.0.0', devDependencies: { 'tools': '^1.0.0' } },
		]));

		expect(result.map(p => p.manifest.name)).toEqual(['utils', 'lib', 'tools']);
	});

	test('should throw on circular dependencies', () => {
		expect(() => sortByDependencies(toPackages([
			{ name: 'a', version: '1.0.0', dependencies: { 'b': '^1.0.0' } },
			{ name: 'b', version: '1.0.0', dependencies: { 'a': '^1.0.0' } },
		]))).toThrow('Circular dependency');
	});

});
