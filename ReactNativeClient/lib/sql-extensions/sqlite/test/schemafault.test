# 2018-08-19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Test OOM injection in schema-related operations.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix schemafault

do_execsql_test 1.0 {
  CREATE TABLE t2(aaa INTTT);
  CREATE VIEW v2(xxx , yyy) AS SELECT aaa, aaa+1 FROM t2;
}

do_faultsim_test 1 -faults oom-* -prep {
} -body {
  execsql { SELECT * FROM v2 }
} -test {
  faultsim_test_result {0 {}}
}

finish_test
