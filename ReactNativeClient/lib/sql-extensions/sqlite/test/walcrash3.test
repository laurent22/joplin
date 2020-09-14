# 2011 December 16
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
# This test simulates an application crash immediately following a
# system call to truncate a file. Specifically, the system call that
# truncates the WAL file if "PRAGMA journal_size_limit" is configured.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !wal {finish_test ; return }
set testprefix walcrash3

db close
testvfs tvfs
tvfs filter {xTruncate xWrite}
tvfs script tvfs_callback
proc tvfs_callback {args} {}

sqlite3 db test.db -vfs tvfs
do_execsql_test 1.1 {
  PRAGMA page_size = 1024;
  PRAGMA journal_mode = WAL;
  PRAGMA wal_autocheckpoint = 128;
  PRAGMA journal_size_limit = 16384;

  CREATE TABLE t1(a BLOB, b BLOB, UNIQUE(a, b));
  INSERT INTO t1 VALUES(randomblob(10), randomblob(1000));
} {wal 128 16384}

proc tvfs_callback {method file arglist} {
  if {$::state==1} {
    foreach f [glob -nocomplain xx_test.*] { forcedelete $f }
    foreach f [glob -nocomplain test.*]    { forcecopy $f "xx_$f" }
    set ::state 2
  }
  if {$::state==0 && $method=="xTruncate" && [file tail $file]=="test.db-wal"} {
    set ::state 1
  }
}

for {set i 2} {$i<1000} {incr i} {

  # If the WAL file is truncated within the following, within the following
  # xWrite call the [tvfs_callback] makes a copy of the database and WAL 
  # files set sets $::state to 2. So that the copied files are in the same
  # state as the real database and WAL files would be if an application crash 
  # occurred immediately following the xTruncate().
  # 
  set ::state 0
  do_execsql_test 1.$i.1 {
    INSERT INTO t1 VALUES(randomblob(10), randomblob(1000));
  }

  # If a copy was made, open it and run the integrity-check.
  #
  if {$::state==2} {
    sqlite3 db2 xx_test.db
    do_test 1.$i.2 { execsql { PRAGMA integrity_check  } db2 } "ok"
    do_test 1.$i.3 { execsql { SELECT count(*) FROM t1 } db2 } [expr $i-1]
    db2 close
  }
}
catch { db close }
tvfs delete

#--------------------------------------------------------------------------
#
catch { db close }
forcedelete test.db

do_test 2.1 {
  sqlite3 db test.db
  execsql {
    PRAGMA page_size = 512;
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 128;
    CREATE TABLE t1(a PRIMARY KEY, b);
    INSERT INTO t1 VALUES(randomblob(25), randomblob(200));
  }

  for {set i 0} {$i < 1500} {incr i} {
    execsql { INSERT INTO t1 VALUES(randomblob(25), randomblob(200)) }
  }

  db_save
  db close
} {}

set nInitialErr [set_test_counter errors]
for {set i 2} {$i<10000 && [set_test_counter errors]==$nInitialErr} {incr i} {

  do_test 2.$i.1 {
    catch { db close } 
    db_restore
    crashsql -delay 2 -file test.db-wal -seed $i {
      SELECT * FROM sqlite_master;
      PRAGMA synchronous = full;
      PRAGMA wal_checkpoint;
      BEGIN;
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
        INSERT INTO t1 VALUES(randomblob(26), randomblob(200));
      COMMIT;
    }
  } {1 {child process exited abnormally}}

  do_test 2.$i.2 {
    sqlite3 db test.db
    execsql { PRAGMA integrity_check } 
  } {ok}
}

finish_test
