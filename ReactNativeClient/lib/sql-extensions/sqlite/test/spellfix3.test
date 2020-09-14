# 2015-12-17
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix spellfix3

ifcapable !vtab { finish_test ; return }

load_static_extension db spellfix

do_execsql_test 100 {
  SELECT spellfix1_scriptcode('And God said, “Let there be light”');
} {215}
do_execsql_test 110 {
  SELECT spellfix1_scriptcode('Бог сказал: "Да будет свет"');
} {220}
do_execsql_test 120 {
  SELECT spellfix1_scriptcode('και ειπεν ο θεος γενηθητω φως και εγενετο φως');
} {200}
do_execsql_test 130 {
  SELECT spellfix1_scriptcode('וַיֹּ֥אמֶר אֱלֹהִ֖ים יְהִ֣י א֑וֹר וַֽיְהִי־אֽוֹר׃');
} {125}
do_execsql_test 140 {
  SELECT spellfix1_scriptcode('فِي ذَلِكَ الوَقتِ، قالَ اللهُ: لِيَكُنْ نُورٌ. فَصَارَ نُورٌ.');
} {160}
do_execsql_test 200 {
  SELECT spellfix1_scriptcode('+3.14159');
} {215}
do_execsql_test 210 {
  SELECT spellfix1_scriptcode('And God said: "Да будет свет"');
} {998}
do_execsql_test 220 {
  SELECT spellfix1_scriptcode('+3.14159 light');
} {215}
do_execsql_test 230 {
  SELECT spellfix1_scriptcode('+3.14159 свет');
} {220}
do_execsql_test 240 {
  SELECT spellfix1_scriptcode('וַיֹּ֥אמֶר +3.14159');
} {125}

finish_test
