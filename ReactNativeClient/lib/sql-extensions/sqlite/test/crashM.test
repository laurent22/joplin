# 2015 Mar 13
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
# Crash tests for the multiplex module with 8.3 filenames enabled.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix crashM

ifcapable !crashtest||!8_3_names {
  finish_test
  return
}

db close
sqlite3_shutdown
sqlite3_config_uri 1

foreach f [glob -nocomplain test1.* test2.*] { forcedelete $f }
sqlite3_multiplex_initialize "" 1
sqlite3 db file:test1.db?8_3_names=1
sqlite3_multiplex_control db main chunk_size [expr 64*1024]

do_execsql_test 1.0 {
  ATTACH 'file:test2.db?8_3_names=1' AS aux;

  CREATE TABLE t1(x, y);
  CREATE INDEX t1x ON t1(x);
  CREATE INDEX t1y ON t1(y);

  CREATE TABLE aux.t2(x, y);
  CREATE INDEX aux.t2x ON t2(x);
  CREATE INDEX aux.t2y ON t2(y);

  WITH s(a) AS (
    SELECT 1 UNION ALL SELECT a+1 FROM s WHERE a<1000
  )
  INSERT INTO t1 SELECT a, randomblob(500) FROM s;

  WITH s(a) AS (
    SELECT 1 UNION ALL SELECT a+1 FROM s WHERE a<1000
  )
  INSERT INTO t2 SELECT a, randomblob(500) FROM s;
} {}

for {set i 0} {$i < 20} {incr i} {
  do_test 2.$i.1 {
    crashsql -delay 1 -file test1.db -opendb {
      sqlite3_shutdown
      sqlite3_config_uri 1
      sqlite3_multiplex_initialize crash 1
      sqlite3 db file:test1.db?8_3_names=1
      sqlite3_multiplex_control db main chunk_size [expr 64*1024]
    } {
      ATTACH 'file:test2.db?8_3_names=1' AS aux;
      BEGIN;
        UPDATE t1 SET y = randomblob(500) WHERE (x%10)==0;
        UPDATE t2 SET y = randomblob(500) WHERE (x%10)==0;
      COMMIT;
    }
  } {1 {child process exited abnormally}}

  do_execsql_test 2.$i.2 {
    PRAGMA main.integrity_check;
    PRAGMA aux.integrity_check;
  } {ok ok}
}

catch { db close }
sqlite3_multiplex_shutdown
finish_test
