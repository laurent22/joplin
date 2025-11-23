"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollator = getCollator;
exports.getCollatorLocale = getCollatorLocale;
const locale_1 = require("../../locale");
function getCollator(locale = getCollatorLocale()) {
    return new Intl.Collator(locale, { numeric: true, sensitivity: 'accent' });
}
function getCollatorLocale() {
    const collatorLocale = (0, locale_1.languageCodeOnly)((0, locale_1.currentLocale)());
    return collatorLocale;
}
