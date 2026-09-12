import { CanvasColor } from './jsoncanvas';
import { ThemeAppearance } from '../../themes/type';

// JSONCanvas spec defines a preset palette keyed by strings '1'–'6'. We store
// the ID in the canvas so files round-trip cleanly with other tools (Obsidian
// etc.), and resolve to hex at render time based on the current theme — a
// single hex that looks fine on white is unreadable on dark, so each preset
// needs a light-mode and dark-mode variant.
//
// The `stroke` variant is used for edge lines and node borders (high-contrast
// against the canvas background); `fill` is used for tinted node backgrounds
// (softer, so card contents stay readable).

export type PresetRole = 'stroke' | 'fill';

interface PresetHexes {
	stroke: string;
	fill: string;
}

interface Preset {
	id: CanvasColor;
	label: string;
	light: PresetHexes;
	dark: PresetHexes;
}

export const presetColors: Preset[] = [
	{ id: '1', label: 'Red', light: { stroke: '#d64545', fill: '#fde5e5' }, dark: { stroke: '#e57373', fill: '#4a2a2a' } },
	{ id: '2', label: 'Orange', light: { stroke: '#e67e22', fill: '#fdead0' }, dark: { stroke: '#f0a458', fill: '#4a3520' } },
	{ id: '3', label: 'Yellow', light: { stroke: '#c9a227', fill: '#fbf3c7' }, dark: { stroke: '#e6c968', fill: '#4a4020' } },
	{ id: '4', label: 'Green', light: { stroke: '#3a9a4a', fill: '#dcf3e0' }, dark: { stroke: '#6fbf7f', fill: '#264530' } },
	{ id: '5', label: 'Cyan', light: { stroke: '#1e8fa8', fill: '#d4f0f5' }, dark: { stroke: '#57bfd4', fill: '#20404a' } },
	{ id: '6', label: 'Purple', light: { stroke: '#8e44ad', fill: '#ecdcf3' }, dark: { stroke: '#b078d0', fill: '#3d2a4a' } },
];

const presetById = new Map<string, Preset>(presetColors.map(p => [p.id, p]));

// Returns a CSS colour for the given canvas colour. Preset IDs are theme-mapped;
// hex strings authored by other tools pass through unchanged (spec-allowed
// escape hatch — no theme mapping is possible without knowing the intent).
// Returns undefined for unset / unrecognised values so callers can fall back
// to their default styling.
export const resolveCanvasColor = (
	color: CanvasColor | undefined,
	appearance: ThemeAppearance,
	role: PresetRole,
): string | undefined => {
	if (!color) return undefined;
	const preset = presetById.get(color);
	if (preset) {
		return appearance === ThemeAppearance.Dark ? preset.dark[role] : preset.light[role];
	}
	// Not a preset ID — treat as an arbitrary CSS colour (hex, rgb(), name).
	// The spec only formally allows hex, but we don't gain anything by
	// rejecting other CSS values that browsers accept.
	return color;
};
