import { PluginManifest } from '../types';

export type ManifestSlice = Pick<PluginManifest, 'app_min_version'|'app_min_version_mobile'|'platforms'>;
