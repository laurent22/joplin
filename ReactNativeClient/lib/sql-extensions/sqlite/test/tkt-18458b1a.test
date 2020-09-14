# 2019 September 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. In particular,
# that problems related to ticket [18458b1a] have been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-18458b1a

foreach tn {1 2} {
  reset_db
  if {$tn==1} {
    # Disable the flattener and push-down optimizations
    optimization_control db query-flattener 0
    optimization_control db push-down 0
  } else {
    # Enable them
    optimization_control db query-flattener 1
    optimization_control db push-down 1
  }

  db cache size 0

  do_execsql_test $tn.1.1 {
    CREATE TABLE t0(c0 COLLATE NOCASE);
    INSERT INTO t0(c0) VALUES ('B');
    CREATE VIEW v0(c0, c1) AS SELECT DISTINCT t0.c0, 'a' FROM t0;
  } 

  do_execsql_test $tn.1.2 {
    SELECT count(*) FROM v0 WHERE c1 >= c0;
  } 1

  do_execsql_test $tn.1.3 {
    SELECT count(*) FROM v0 WHERE NOT NOT (c1 >= c0);
  } 1

  do_execsql_test $tn.1.4 {
    SELECT count(*) FROM v0 WHERE ((c1 >= c0) OR 0+0);
  } 1
}

finish_test
