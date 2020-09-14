# 2016 Aug 12
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
# focus of this script is using the sqlite_interrupt() API to 
# interrupt WAL checkpoint operations.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/wal_common.tcl
set testprefix interrupt2

if {[permutation]=="journaltest" || [permutation]=="inmemory_journal"} {
  finish_test
  return
}

db close
testvfs tvfs -default 1

tvfs filter xWrite
tvfs script write_cb

set ::trigger_interrupt 0
proc write_cb {method args} {
  set filename [lindex $args 0]
  if {[file tail $filename]=="test.db" && $::trigger_interrupt} {
    if {$::trigger_interrupt} {
      incr ::trigger_interrupt -1
      if {$::trigger_interrupt==0} { sqlite3_interrupt db }
    }
  }
  return 0
}

sqlite3 db test.db 
do_execsql_test 1.0 {
  CREATE TABLE t1(a, b);
  CREATE INDEX t1a ON t1(a);
  CREATE INDEX t1b ON t1(b);
  PRAGMA journal_mode = wal;

  WITH ii(i) AS ( VALUES(1) UNION ALL SELECT i+1 FROM ii WHERE i<1000 )
  INSERT INTO t1 SELECT i, i FROM ii;
} {wal}

foreach idelay {
  5
  10
  15
  20
} {

  set ::trigger_interrupt $idelay
  do_catchsql_test 1.$idelay.1 { PRAGMA wal_checkpoint; } {1 interrupted}
  do_execsql_test  1.$idelay.2 { SELECT count(*) FROM t1 } 1000

  set ::trigger_interrupt $idelay
  do_test 1.$idelay.3 { 
    list [catch { sqlite3_wal_checkpoint_v2 db truncate } msg] $msg
  } {1 {SQLITE_INTERRUPT - interrupted}}
  do_execsql_test  1.$idelay.4 { SELECT count(*) FROM t1 } 1000
}

#-------------------------------------------------------------------------
# Check that if there are other SQL statements running, a checkpoint does
# not clear the isInterrupted flag.
#
do_execsql_test 2.0 {
  CREATE TEMP TABLE z1(a, b);
  INSERT INTO z1 SELECT * FROM t1;
}

do_test 2.1 {
  set i 10
  set res [list [catch {
    set i 10
    db eval {SELECT * FROM z1} {
      incr i -1
      if {$i==0} {
        set ::trigger_interrupt 10
        set cres [catch { sqlite3_wal_checkpoint_v2 db truncate } msg] 
        lappend cres $msg
      }
    }
  } msg] $msg]

  list $cres $res
} {{1 {SQLITE_INTERRUPT - interrupted}} {1 interrupted}}

do_execsql_test 2.0 {
  SELECT count(*) FROM t1
  UNION ALL
  SELECT count(*) FROM z1
} {1000 1000}

#-------------------------------------------------------------------------
# Check the effect of an interrupt during sqlite3_close().
#
db_save_and_close

db_restore_and_reopen
do_test 3.1.1 {
  set ::trigger_interrupt 10
  db eval { SELECT * FROM sqlite_master }
  db close
  set {} {}
} {}
do_test 3.1.2 {
  list [file exists test.db] [file exists test.db-wal]
} {1 1}

db_restore_and_reopen
do_test 3.2.1 {
  db eval { SELECT * FROM sqlite_master }
  db close
  set {} {}
} {}
do_test 3.2.2 {
  list [file exists test.db] [file exists test.db-wal]
} {1 0}

#-------------------------------------------------------------------------
# Check the effect of an interrupt during an automatic checkpoint
#
db_restore_and_reopen
do_test 4.0 { 
  execsql { PRAGMA wal_autocheckpoint = 10 }
  set ::trigger_interrupt 10
  execsql { CREATE TABLE t2(x, y) }
} {}

# The auto-checkpoint in test 4.0 should have been interrupted. So this
# db write should cause the wal file to grow.
do_test 4.1 {
  set nFrame1 [wal_frame_count test.db-wal 1024]
  execsql { CREATE TABLE t3(x, y) }
  set nFrame2 [wal_frame_count test.db-wal 1024]
  expr $nFrame2 > $nFrame1
} {1}

# The auto-checkpoint in test 4.0 should not have been interrupted. So 
# this db write should not cause the wal file to grow.
do_test 4.2 {
  set nFrame1 [wal_frame_count test.db-wal 1024]
  execsql { CREATE TABLE t4(x, y) }
  set nFrame2 [wal_frame_count test.db-wal 1024]
  expr $nFrame2 == $nFrame1
} {1}

finish_test
