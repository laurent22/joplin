// Empty stub. Used via the root `resolutions` map to neutralise packages
// pulled in transitively but never actually called (e.g. @xenova/transformers
// → sharp, which we only need at build time).
module.exports = {};
