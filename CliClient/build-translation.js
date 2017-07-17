var localeDir = __dirname + '/app/locale';


var input = require('fs').readFileSync('en.po');
var po = gettextParser.po.parse(input);
// console.log(po.translations['']);