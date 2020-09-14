# 2011 February 21
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
# This file implements tests to verify that ticket [b72787b1a7] has been
# fixed.  From the ticket:
#
#     The sqlite3ExpirePreparedStatements routine marks all statements
#     as expired. This includes statements that are not expired.
#
#     Steps to reproduce:
#
#        * Prepare a statement (A)
#        * Alter the schema to invalidate cookie in A
#        * Prepare a statement (B)
#        * Run B and have A run as part of B
#        * A will find a bad cookie and cause *all* statements
#          to be expired including the currently running B by calling
#          sqlite3ExpirePreparedStatements
#        * When control returns to B it will then abort 
#
#     The bug is that sqlite3ExpirePreparedStatements expires all statements.
#     Note that B was prepared after the schema change and hence is perfectly
#     valid and then is marked as expired while running.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

unset -nocomplain ::STMT
proc runsql {} {
  db eval {CREATE TABLE IF NOT EXISTS t4(q)}
  sqlite3_step $::STMT
  set rc [sqlite3_column_int $::STMT 0]
  sqlite3_reset $::STMT
  return $rc
}

do_test tkt-b72787b1.1 {
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    CREATE TABLE t2(y);
    INSERT INTO t2 SELECT x+2 FROM t1;
    INSERT INTO t2 SELECT x+4 FROM t1;
  }
  db func runsql ::runsql
  set DB [sqlite3_connection_pointer db]
  set sql {SELECT max(x) FROM t1}
  set ::STMT [sqlite3_prepare_v2 $DB $sql -1 TAIL]

  # The runsql() call on the second row of the first query will
  # cause all $::STMT to hit an expired cookie.  Prior to the fix
  # for [b72787b1a7, the bad cookie would expire all statements, including
  # the following compound SELECT, which would cause a fault when the
  # second SELECT was reached.  After the fix, the current statement
  # continues to completion.
  db eval {
    SELECT CASE WHEN y=3 THEN y+100 WHEN y==4 THEN runsql()+200
                ELSE 300+y END FROM t2
    UNION ALL
    SELECT * FROM t1;
  }
} {103 202 305 306 1 2}

sqlite3_finalize $::STMT

finish_test
