# 2017 August 25
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests for the PRAGMA command. Specifically,
# those pragmas that are not disabled at build time by setting:
#
#   -DSQLITE_OMIT_INTROSPECTION_PRAGMAS
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix pragma5

if { [catch {db one "SELECT count(*) FROM pragma_function_list"}] } {
  finish_test
  return
}

db function external external

do_execsql_test 1.0 {
  PRAGMA table_info(pragma_function_list)
} {
  0 name {} 0 {} 0 
  1 builtin {} 0 {} 0
  2 type {} 0 {} 0
  3 enc {} 0 {} 0
  4 narg {} 0 {} 0
  5 flags {} 0 {} 0
}
do_execsql_test 1.1 {
  SELECT DISTINCT name, builtin
    FROM pragma_function_list WHERE name='upper' AND builtin
} {upper 1}
do_execsql_test 1.2 {
  SELECT DISTINCT name, builtin
    FROM pragma_function_list WHERE name LIKE 'exter%';
} {external 0}

ifcapable fts5 {
  do_execsql_test 2.0 {
    PRAGMA table_info(pragma_module_list)
  } {
    0 name {} 0 {} 0 
  }
  do_execsql_test 2.1 {
    SELECT * FROM pragma_module_list WHERE name='fts5'
  } {fts5}
}

do_execsql_test 3.0 {
  PRAGMA table_info(pragma_pragma_list)
} {
  0 name {} 0 {} 0 
}
do_execsql_test 3.1 {
  SELECT * FROM pragma_pragma_list WHERE name='pragma_list'
} {pragma_list}


finish_test
