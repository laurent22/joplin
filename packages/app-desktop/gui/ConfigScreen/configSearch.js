"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchedSearchSections = exports.searchResultGroups = void 0;
const Setting_1 = require("@joplin/lib/models/Setting");
const config_search_text_1 = require("@joplin/lib/components/shared/config/config-search-text");
const isMetadataMatched = (query, section, metadata, appType) => {
    const normalizedQuery = (0, config_search_text_1.normalizeQuery)(query);
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
    return normalizedCandidates.some(value => (0, config_search_text_1.includesNormalizedQuery)(normalizedQuery, value || ''));
};
const searchResultGroups = (query, sections, appType) => {
    const normalizedQuery = (0, config_search_text_1.normalizeQuery)(query);
    if (!normalizedQuery)
        return [];
    const output = [];
    for (const section of sections) {
        const sectionTitleMatched = (0, config_search_text_1.includesNormalizedQuery)(normalizedQuery, Setting_1.default.sectionNameToLabel(section.name));
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
            if (sectionTitleMatched || isMetadataMatched(normalizedQuery, section, metadata, appType)) {
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