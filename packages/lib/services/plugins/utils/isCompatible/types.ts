import { PluginManifest } from '../types';

export type ManifestSlice = Pick<PluginManifest, 'app_min_version'|'platforms'>;
