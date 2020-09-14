# 2010 April 19
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
# focus of this file is testing the operation of the library in
# "PRAGMA journal_mode=WAL" mode.
# 
# More specifically, this file contains regression tests for the 
# sqlite3_wal_hook() mechanism, including the sqlite3_wal_autocheckpoint()
# and "PRAGMA wal_autocheckpoint" convenience interfaces.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/wal_common.tcl

ifcapable !wal {finish_test ; return }

set ::wal_hook [list]
proc wal_hook {zDb nEntry} {
  lappend ::wal_hook $zDb $nEntry
  return 0
}
db wal_hook wal_hook

do_test walhook-1.1 {
  execsql { 
    PRAGMA page_size = 1024;
    PRAGMA auto_vacuum = 0;
    PRAGMA journal_mode = wal;
    PRAGMA synchronous = normal;
    CREATE TABLE t1(i PRIMARY KEY, j);
  }
  set ::wal_hook
} {main 3}

do_test walhook-1.2 {
  set ::wal_hook [list]
  execsql { INSERT INTO t1 VALUES(1, 'one') }
  set ::wal_hook
} {main 5}
do_test walhook-1.3 {
  proc wal_hook {args} { db eval {PRAGMA wal_checkpoint}; return 0 }
  execsql { INSERT INTO t1 VALUES(2, 'two') }
  file size test.db
} [expr 3*1024]
do_test walhook-1.4 {
  proc wal_hook {zDb nEntry} { 
    execsql { PRAGMA wal_checkpoint }
    return 0
  }
  execsql { CREATE TABLE t2(a, b) }
  file size test.db
} [expr 4*1024]

do_test walhook-1.5 {
  sqlite3 db2 test.db
  proc wal_hook {zDb nEntry} {
    execsql { PRAGMA wal_checkpoint } db2
    return 0
  }
  execsql { CREATE TABLE t3(a PRIMARY KEY, b) }
  file size test.db
} [expr 6*1024]

db2 close
db close
sqlite3 db test.db
do_test walhook-2.1 {
  execsql { PRAGMA synchronous = NORMAL }
  execsql { PRAGMA wal_autocheckpoint }
} {1000}
do_test walhook-2.2 {
  execsql { PRAGMA wal_autocheckpoint = 10}
} {10}
do_test walhook-2.3 {
  execsql { PRAGMA wal_autocheckpoint }
} {10}

#
# The database connection is configured with "PRAGMA wal_autocheckpoint = 10".
# Check that transactions are written to the log file until it contains at
# least 10 frames, then the database is checkpointed. Subsequent transactions
# are written into the start of the log file.
#
foreach {tn sql dbpages logpages} {
  4 "CREATE TABLE t4(x PRIMARY KEY, y)"   6   3
  5 "INSERT INTO t4 VALUES(1, 'one')"     6   5
  6 "INSERT INTO t4 VALUES(2, 'two')"     6   7
  7 "INSERT INTO t4 VALUES(3, 'three')"   6   9
  8 "INSERT INTO t4 VALUES(4, 'four')"    8  11
  9 "INSERT INTO t4 VALUES(5, 'five')"    8  11
} {
  do_test walhook-2.$tn {
    execsql $sql
    list [file size test.db] [file size test.db-wal]
  } [list [expr $dbpages*1024] [wal_file_size $logpages 1024]]
}

catch { db2 close }
catch { db close }
finish_test
