/* eslint-disable import/prefer-default-export */

const Entities = require('html-entities').AllHtmlEntities;

export const htmlentities = new Entities().encode;
