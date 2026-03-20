"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchedSearchSections = exports.searchResultGroups = exports.isMetadataMatched = exports.includesNormalizedQuery = exports.equalsNormalizedQuery = exports.hasNormalizedQuery = exports.normalizeQuery = void 0;
const Setting_1 = require("../../../models/Setting");
// Platform-agnostic query normalization for config search.
const normalizeQuery = (query) => {
    return query.trim().toLowerCase();
};
exports.normalizeQuery = normalizeQuery;
// Returns true when query has non-whitespace characters after normalization.
const hasNormalizedQuery = (query) => {
    return !!(0, exports.normalizeQuery)(query);
};
exports.hasNormalizedQuery = hasNormalizedQuery;
// Normalized string equality check used by cross-platform search UI layers.
const equalsNormalizedQuery = (query, value) => {
    const normalizedQuery = (0, exports.normalizeQuery)(query);
    if (!normalizedQuery)
        return false;
    return (0, exports.normalizeQuery)(value) === normalizedQuery;
};
exports.equalsNormalizedQuery = equalsNormalizedQuery;
// Normalized substring check used by cross-platform search UI layers.
const includesNormalizedQuery = (query, value) => {
    const normalizedQuery = (0, exports.normalizeQuery)(query);
    if (!normalizedQuery)
        return false;
    return (0, exports.normalizeQuery)(value).includes(normalizedQuery);
};
exports.includesNormalizedQuery = includesNormalizedQuery;
// Matches config metadata text against a normalized query.
const isMetadataMatched = (query, section, metadata, appType) => {
    const normalizedQuery = (0, exports.normalizeQuery)(query);
    if (!normalizedQuery)
        return true;
    const metadataLabel = metadata.label ? metadata.label() : '';
    const metadataDescription = metadata.description ? metadata.description(appType) : '';
    const sectionLabel = Setting_1.default.sectionNameToLabel(section.name);
    const normalizedCandidates = [
        sectionLabel,
        metadataLabel,
        metadataDescription,
    ];
    return normalizedCandidates.some(value => (0, exports.includesNormalizedQuery)(normalizedQuery, value || ''));
};
exports.isMetadataMatched = isMetadataMatched;
// Computes grouped search hits from section metadata.
const searchResultGroups = (query, sections, appType) => {
    const normalizedQuery = (0, exports.normalizeQuery)(query);
    if (!normalizedQuery)
        return [];
    const output = [];
    for (const section of sections) {
        const sectionTitleMatched = (0, exports.includesNormalizedQuery)(normalizedQuery, Setting_1.default.sectionNameToLabel(section.name));
        if (sectionTitleMatched && section.isScreen) {
            output.push({
                sectionName: section.name,
                matchingKeys: [],
            });
            continue;
        }
        const matchingKeys = [];
        for (const metadata of section.metadatas) {
            if (!metadata.key)
                continue;
            if (sectionTitleMatched || (0, exports.isMetadataMatched)(normalizedQuery, section, metadata, appType)) {
                matchingKeys.push(metadata.key);
            }
        }
        if (!matchingKeys.length)
            continue;
        output.push({
            sectionName: section.name,
            matchingKeys,
        });
    }
    return output;
};
exports.searchResultGroups = searchResultGroups;
// Maps grouped search hits back to concrete section metadata for rendering.
const matchedSearchSections = (sections, groups) => {
    if (!groups.length)
        return [];
    const sectionByName = {};
    for (const section of sections) {
        sectionByName[section.name] = section;
    }
    const output = [];
    for (const group of groups) {
        const section = sectionByName[group.sectionName];
        if (!section)
            continue;
        const matchingKeySet = new Set(group.matchingKeys);
        const metadatas = section.metadatas.filter(metadata => metadata.key && matchingKeySet.has(metadata.key));
        if (!metadatas.length && !section.isScreen)
            continue;
        output.push({
            section: Object.assign(Object.assign({}, section), { metadatas }),
            matchingKeys: group.matchingKeys,
        });
    }
    return output;
};
exports.matchedSearchSections = matchedSearchSections;
//# sourceMappingURL=configSearch.js.map