require(__dirname).test({
  xml: '<compileClassesResponse>' +
    '<result>' +
    '<bodyCrc>653724009</bodyCrc>' +
    '<column>-1</column>' +
    '<id>01pG0000002KoSUIA0</id>' +
    '<line>-1</line>' +
    '<name>CalendarController</name>' +
    '<success>true</success>' +
    '</result>' +
    '</compileClassesResponse>',
  expect: [
    [ 'opentagstart', { name: 'COMPILECLASSESRESPONSE', attributes: {} } ],
    [ 'opentag', { name: 'COMPILECLASSESRESPONSE', attributes: {}, isSelfClosing: false } ],
    [ 'opentagstart', { name: 'RESULT', attributes: {} } ],
    [ 'opentag', { name: 'RESULT', attributes: {}, isSelfClosing: false } ],
    [ 'opentagstart', { name: 'BODYCRC', attributes: {} } ],
    [ 'opentag', { name: 'BODYCRC', attributes: {}, isSelfClosing: false } ],
    [ 'text', '653724009' ],
    [ 'closetag', 'BODYCRC' ],
    [ 'opentagstart', { name: 'COLUMN', attributes: {} } ],
    [ 'opentag', { name: 'COLUMN', attributes: {}, isSelfClosing: false } ],
    [ 'text', '-1' ],
    [ 'closetag', 'COLUMN' ],
    [ 'opentagstart', { name: 'ID', attributes: {} } ],
    [ 'opentag', { name: 'ID', attributes: {}, isSelfClosing: false } ],
    [ 'text', '01pG0000002KoSUIA0' ],
    [ 'closetag', 'ID' ],
    [ 'opentagstart', { name: 'LINE', attributes: {} } ],
    [ 'opentag', { name: 'LINE', attributes: {}, isSelfClosing: false } ],
    [ 'text', '-1' ],
    [ 'closetag', 'LINE' ],
    [ 'opentagstart', { name: 'NAME', attributes: {} } ],
    [ 'opentag', { name: 'NAME', attributes: {}, isSelfClosing: false } ],
    [ 'text', 'CalendarController' ],
    [ 'closetag', 'NAME' ],
    [ 'opentagstart', { name: 'SUCCESS', attributes: {} } ],
    [ 'opentag', { name: 'SUCCESS', attributes: {}, isSelfClosing: false } ],
    [ 'text', 'true' ],
    [ 'closetag', 'SUCCESS' ],
    [ 'closetag', 'RESULT' ],
    [ 'closetag', 'COMPILECLASSESRESPONSE' ]
  ],
  strict: false,
  opt: {}
})
