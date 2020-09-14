# 2019 July 17
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
# This file contains fault-injection test cases for the 
# sqlite3_db_cacheflush API.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix cffault
source $testdir/malloc_common.tcl

do_execsql_test 1.0 {
  CREATE TABLE t1 (Col0 CHECK(1 COLLATE BINARY BETWEEN 1 AND 1) ) ;
  CREATE TABLE t2(b, a CHECK(
      CASE 'abc' COLLATE nocase WHEN a THEN 1 ELSE 0 END)
  );
}

do_faultsim_test 1.1 -faults oom* -body {
  execsql { INSERT INTO t1 VALUES ('ABCDEFG') }
} -test {
  faultsim_test_result {0 {}}
}

do_faultsim_test 1.2 -faults oom* -body {
  execsql { INSERT INTO t2(a) VALUES('abc') }
} -test {
  faultsim_test_result {0 {}}
}


finish_test
