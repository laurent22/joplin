# 2018 May 8
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix filterfault

ifcapable !windowfunc {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b, c, d);
  INSERT INTO t1 VALUES(1, 2, 3, 4);
  INSERT INTO t1 VALUES(5, 6, 7, 8);
  INSERT INTO t1 VALUES(9, 10, 11, 12);
}
faultsim_save_and_close

do_faultsim_test 1 -faults oom-t* -prep {
  faultsim_restore_and_reopen
} -body {
  execsql {
    SELECT sum(a) FILTER (WHERE b<5),
           count() FILTER (WHERE d!=c) 
      FROM t1 GROUP BY c ORDER BY 1;
  }
} -test {
  faultsim_test_result {0 {{} 1 {} 1 1 1}}
}


finish_test
