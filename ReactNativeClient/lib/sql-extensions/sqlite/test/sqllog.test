# 2015 November 13
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the test_sqllog.c module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix sqllog

ifcapable !sqllog {
  finish_test
  return
}

proc readfile {f} {
  set fd [open $f]
  set txt [read $fd]
  close $fd
  set txt
}

proc delete_all_sqllog_files {} {
  forcedelete {*}[glob -nocomplain sqllog_*.sql]
  forcedelete {*}[glob -nocomplain sqllog_*.db]
  forcedelete {*}[glob -nocomplain sqllog_*.idx]
}

proc touch {f} {
  set fd [open $f w+]
  close $fd
}

db close
sqlite3_shutdown
set ::env(SQLITE_SQLLOG_DIR) [pwd]

delete_all_sqllog_files

sqlite3 db test.db
set a a
set b b
do_execsql_test 1.0 {
  CREATE TABLE t1(x, y);
  INSERT INTO t1 VALUES(1, 2);
  INSERT INTO t1 VALUES($a, $b);
  SELECT * FROM t1;
} {1 2 a b}
db close

do_test 1.1 {
  readfile [lindex [glob sqllog_*.sql] 0]
} [string trimleft {
/-- Main database is '.*/sqllog_.*_0.db'
CREATE TABLE t1\(x, y\);; -- clock=0
INSERT INTO t1 VALUES\(1, 2\);; -- clock=1
INSERT INTO t1 VALUES\('a', 'b'\);; -- clock=2
SELECT . FROM t1;; -- clock=3
/}]

do_test 1.2 {
  file size [lindex [glob sqllog_*_0.db] 0]
} 1024

#-------------------------------------------------------------------------
catch { db close }
sqlite3_shutdown
delete_all_sqllog_files
forcedelete test.db-sqllog

set ::env(SQLITE_SQLLOG_CONDITIONAL) 1
sqlite3 db test.db
do_execsql_test 2.1 {
  INSERT INTO t1 VALUES(4, 5);
  SELECT * FROM t1;
} {1 2 a b 4 5}

do_test 2.2 {
  glob -nocomplain sqllog_*
} {}

db close
touch test.db-sqllog
sqlite3 db test.db
do_execsql_test 2.3 {
  INSERT INTO t1 VALUES(6, 7);
  SELECT * FROM t1;
} {1 2 a b 4 5 6 7}
db close

do_test 2.4 {
  readfile [lindex [glob sqllog_*.sql] 0]
} [string trimleft {
/-- Main database is '.*/sqllog_.*_0.db'
INSERT INTO t1 VALUES\(6, 7\);; -- clock=0
SELECT . FROM t1;; -- clock=1
/}]

catch { db close }
sqlite3_shutdown
unset ::env(SQLITE_SQLLOG_DIR)
unset ::env(SQLITE_SQLLOG_CONDITIONAL)
sqlite3_config_sqllog
sqlite3_initialize
finish_test
