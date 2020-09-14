# 2017-06-29
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
# Testing of the STMT virtual table.
#
# This also validates the SQLITE_STMTSTATUS_REPREPARE and
# SQLITE_STMTSTATUS_RUN values for sqlite3_stmt_status().
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !stmtvtab {
  finish_test
  return
}

db cache flush
db cache size 20
unset -nocomplain x y z
set x giraffe
set y mango
set z alabama
do_execsql_test stmtvtab1-100 {
  CREATE TABLE t1(a,b,c);
  INSERT INTO t1 VALUES($a,$b,$c);
  CREATE INDEX t1a ON t1(a);
  SELECT run, sql FROM sqlite_stmt ORDER BY 1;
} {1 {SELECT run, sql FROM sqlite_stmt ORDER BY 1;} 1 {CREATE INDEX t1a ON t1(a);} 1 {INSERT INTO t1 VALUES($a,$b,$c);} 1 {CREATE TABLE t1(a,b,c);}}
set x neon
set y event
set z future
do_execsql_test stmtvtab1-110 {
  INSERT INTO t1 VALUES($a,$b,$c);
  SELECT reprep,run,SQL FROM sqlite_stmt WHERE sql LIKE '%INSERT%' AND NOT busy;
} {1 2 {INSERT INTO t1 VALUES($a,$b,$c);}}
set x network
set y fit
set z metal
do_execsql_test stmtvtab1-120 {
  INSERT INTO t1 VALUES($a,$b,$c);
  SELECT reprep,run,SQL FROM sqlite_stmt WHERE sql LIKE '%INSERT%' AND NOT busy;
} {1 3 {INSERT INTO t1 VALUES($a,$b,$c);}}
set x history
set y detail
set z grace
do_execsql_test stmtvtab1-130 {
  CREATE INDEX t1b ON t1(b);
  INSERT INTO t1 VALUES($a,$b,$c);
  SELECT reprep,run,SQL FROM sqlite_stmt WHERE sql LIKE '%INSERT%' AND NOT busy;
} {2 4 {INSERT INTO t1 VALUES($a,$b,$c);}}

# All statements are still in cache
#
do_execsql_test stmtvtab1-140 {
  SELECT count(*) FROM sqlite_stmt WHERE NOT busy;
} {6}

# None of the prepared statements should use more than a couple thousand
# bytes of memory
#
#db eval {SELECT mem, sql FROM sqlite_stmt} {puts [format {%5d %s} $mem $sql]}
do_execsql_test stmtvtab1-150 {
  SELECT count(*) FROM sqlite_stmt WHERE mem>5000;
} {0}

# Flushing the cache clears all of the prepared statements.
#
db cache flush
do_execsql_test stmtvtab1-160 {
  SELECT * FROM sqlite_stmt WHERE NOT busy;
} {}

finish_test
