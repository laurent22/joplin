"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollatorLocale = exports.getCollator = void 0;
const locale_1 = require("../../locale");
function getCollator(locale = getCollatorLocale()) {
    return new Intl.Collator(locale, { numeric: true, sensitivity: 'accent' });
}
exports.getCollator = getCollator;
function getCollatorLocale() {
    const collatorLocale = (0, locale_1.languageCodeOnly)((0, locale_1.currentLocale)());
    return collatorLocale;
}
exports.getCollatorLocale = getCollatorLocale;
//# sourceMappingURL=getCollator.js.map