# 2010 May 03
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
source $testdir/lock_common.tcl

ifcapable !wal {finish_test ; return }

#-------------------------------------------------------------------------
# This test case, walfault-1-*, simulates faults while executing a
#
#   PRAGMA journal_mode = WAL;
#
# statement immediately after creating a new database.
#
do_test walfault-1-pre-1 {
  faultsim_delete_and_reopen
  faultsim_save_and_close
} {}
do_faultsim_test walfault-1 -prep {
  faultsim_restore_and_reopen
} -body {
  db eval { PRAGMA main.journal_mode = WAL }
} -test {

  faultsim_test_result {0 wal}

  # Test that the connection that encountered an error as part of 
  # "PRAGMA journal_mode = WAL" and a new connection use the same
  # journal mode when accessing the database.
  #
  # If "PRAGMA journal_mode" is executed immediately, connection [db] (the 
  # one that hit the error in journal_mode="WAL") might return "wal" even 
  # if it failed to switch the database to WAL mode. This is not considered 
  # a problem. When it tries to read the database, connection [db] correctly 
  # recognizes that it is a rollback database and switches back to a 
  # rollback compatible journal mode.
  #
  if {[permutation] != "inmemory_journal"} {
    set jm  [db one  {SELECT * FROM sqlite_master ; PRAGMA main.journal_mode}]
    sqlite3 db2 test.db
    set jm2 [db2 one {SELECT * FROM sqlite_master ; PRAGMA main.journal_mode}]
    db2 close
  
    if { $jm!=$jm2 } { error "Journal modes do not match: $jm $jm2" }
    if { $testrc==0 && $jm!="wal" } { error "Journal mode is not WAL" }
  }
}

#--------------------------------------------------------------------------
# Test case walfault-2-* tests fault injection during recovery of a 
# short WAL file (a dozen frames or thereabouts).
#
do_test walfault-2-pre-1 {
  sqlite3 db test.db
  execsql {
    PRAGMA journal_mode = WAL;
    BEGIN;
      CREATE TABLE x(y, z, UNIQUE(y, z));
      INSERT INTO x VALUES(randomblob(100), randomblob(100));
    COMMIT;
    PRAGMA wal_checkpoint;

    INSERT INTO x SELECT randomblob(100), randomblob(100) FROM x;
    INSERT INTO x SELECT randomblob(100), randomblob(100) FROM x;
    INSERT INTO x SELECT randomblob(100), randomblob(100) FROM x;
  }
  execsql {
    SELECT count(*) FROM x
  }
} {8}
do_test walfault-2-pre-2 {
  faultsim_save_and_close
  faultsim_restore_and_reopen
  execsql { SELECT count(*) FROM x }
} {8}
do_faultsim_test walfault-2 -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { SELECT count(*) FROM x }
} -test {
  faultsim_test_result {0 8}
  faultsim_integrity_check
}

#--------------------------------------------------------------------------
# Test fault injection while writing and checkpointing a small WAL file.
#
do_test walfault-3-pre-1 {
  sqlite3 db test.db
  execsql {
    PRAGMA auto_vacuum = 1;
    PRAGMA journal_mode = WAL;
    CREATE TABLE abc(a PRIMARY KEY);
    INSERT INTO abc VALUES(randomblob(1500));
  }
  db close
  faultsim_save_and_close
} {}
do_faultsim_test walfault-3 -prep {
  faultsim_restore_and_reopen
} -body {
  db eval {
    DELETE FROM abc;
    PRAGMA wal_checkpoint;
  }
  set {} {}
} -test {
  faultsim_test_result {0 {}}
}

#--------------------------------------------------------------------------
#
if {[permutation] != "inmemory_journal"} {
  faultsim_delete_and_reopen
  faultsim_save_and_close
  do_faultsim_test walfault-4 -prep {
    faultsim_restore_and_reopen
  } -body {
    execsql {
      PRAGMA auto_vacuum = 0;
      PRAGMA journal_mode = WAL;
      CREATE TABLE t1(a PRIMARY KEY, b);
      INSERT INTO t1 VALUES('a', 'b');
      PRAGMA wal_checkpoint;
      SELECT * FROM t1;
    }
  } -test {
    # Update: The following changed from {0 {wal 0 7 7 a b}} as a result
    # of PSOW being set by default.
    faultsim_test_result {0 {wal 0 5 5 a b}}
    faultsim_integrity_check
  } 
}

#--------------------------------------------------------------------------
#
do_test walfault-5-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA page_size = 512;
    PRAGMA journal_mode = WAL;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-5 -faults shmerr* -prep {
  faultsim_restore_and_reopen
  execsql { PRAGMA wal_autocheckpoint = 0 }
  shmfault filter xShmMap
} -body {
  execsql {
    CREATE TABLE t1(x);
    BEGIN;
      INSERT INTO t1 VALUES(randomblob(400));           /* 1 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 2 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 4 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 8 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 16 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 32 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 64 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 128 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 256 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 512 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 1024 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 2048 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 4096 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 8192 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 16384 */
    COMMIT;
    SELECT count(*) FROM t1;
  }
} -test {
  faultsim_test_result {0 16384}
  faultsim_integrity_check
}

#--------------------------------------------------------------------------
#
do_test walfault-6-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA page_size = 512;
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 0;
    CREATE TABLE t1(x);
    BEGIN;
      INSERT INTO t1 VALUES(randomblob(400));           /* 1 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 2 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 4 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 8 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 16 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 32 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 64 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 128 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 256 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 512 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 1024 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 2048 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 4096 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 8192 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 16384 */
    COMMIT;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-6 -faults shmerr* -prep {
  faultsim_restore_and_reopen
  shmfault filter xShmMap
} -body {
  execsql { SELECT count(*) FROM t1 }
} -test {
  faultsim_test_result {0 16384}
  faultsim_integrity_check
  set n [db one {SELECT count(*) FROM t1}]
  if {$n != 16384 && $n != 0} { error "Incorrect number of rows: $n" }
}

#--------------------------------------------------------------------------
#
do_test walfault-7-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA page_size = 512;
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 0;
    CREATE TABLE t1(x);
    BEGIN;
      INSERT INTO t1 VALUES(randomblob(400));           /* 1 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 2 */
      INSERT INTO t1 SELECT randomblob(400) FROM t1;    /* 4 */
    COMMIT;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-7 -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { SELECT count(*) FROM t1 }
} -test {
  faultsim_test_result {0 4}
  set n [db one {SELECT count(*) FROM t1}]
  if {$n != 4 && $n != 0} { error "Incorrect number of rows: $n" }
}

#--------------------------------------------------------------------------
#
do_test walfault-8-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA journal_mode = WAL;
    CREATE TABLE abc(a PRIMARY KEY);
    INSERT INTO abc VALUES(randomblob(900));
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-8 -prep {
  faultsim_restore_and_reopen
  execsql { PRAGMA cache_size = 10 }
} -body {
  execsql {
    BEGIN;
      INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 1 */
      --INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 2 */
      --INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 4 */
      --INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 8 */
    ROLLBACK;
    SELECT count(*) FROM abc;
  }
} -test {
  faultsim_test_result {0 1}

  faultsim_integrity_check
  catch { db eval ROLLBACK }
  faultsim_integrity_check

  set n [db one {SELECT count(*) FROM abc}]
  if {$n != 1} { error "Incorrect number of rows: $n" }
}

#--------------------------------------------------------------------------
#
do_test walfault-9-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA journal_mode = WAL;
    CREATE TABLE abc(a PRIMARY KEY);
    INSERT INTO abc VALUES(randomblob(900));
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-9 -prep {
  #if {$iFail<73} { set iFail 73 }
  #if {$iFail>73} { exit }
  
  faultsim_restore_and_reopen
  execsql { PRAGMA cache_size = 10 }
} -body {
  execsql {
    BEGIN;
      INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 1 */
      SAVEPOINT spoint;
        INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 2 */
        INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 4 */
        INSERT INTO abc SELECT randomblob(900) FROM abc;    /* 8 */
      ROLLBACK TO spoint;
    COMMIT;
    SELECT count(*) FROM abc;
  }
} -test {
  faultsim_test_result {0 2}
  faultsim_integrity_check

  catch { db eval { ROLLBACK TO spoint } }
  catch { db eval { COMMIT } }
  set n [db one {SELECT count(*) FROM abc}]
  if {$n != 1 && $n != 2} { error "Incorrect number of rows: $n" }
}

do_test walfault-10-pre1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 0;
    CREATE TABLE z(zz INTEGER PRIMARY KEY, zzz BLOB);
    CREATE INDEX zzzz ON z(zzz);
    INSERT INTO z VALUES(NULL, randomblob(800));
    INSERT INTO z VALUES(NULL, randomblob(800));
    INSERT INTO z SELECT NULL, randomblob(800) FROM z;
    INSERT INTO z SELECT NULL, randomblob(800) FROM z;
    INSERT INTO z SELECT NULL, randomblob(800) FROM z;
    INSERT INTO z SELECT NULL, randomblob(800) FROM z;
    INSERT INTO z SELECT NULL, randomblob(800) FROM z;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-10 -prep {
  faultsim_restore_and_reopen
  execsql {
    PRAGMA cache_size = 10;
    BEGIN;
      UPDATE z SET zzz = randomblob(799);
  }

  set ::stmt [sqlite3_prepare db "SELECT zzz FROM z WHERE zz IN (1, 2, 3)" -1]
  sqlite3_step $::stmt
} -body {
  execsql { INSERT INTO z VALUES(NULL, NULL) }
} -test {
  sqlite3_finalize $::stmt
  faultsim_integrity_check

  faultsim_test_result {0 {}}
  catch { db eval { ROLLBACK } }
  faultsim_integrity_check

  set n [db eval {SELECT count(*), sum(length(zzz)) FROM z}]
  if {$n != "64 51200"} { error "Incorrect data: $n" }
}

#--------------------------------------------------------------------------
# Test fault injection while checkpointing a large WAL file, if the 
# checkpoint is the first operation run after opening the database.
# This means that some of the required wal-index pages are mapped as part of
# the checkpoint process, which means there are a few more opportunities
# for IO errors.
#
# To speed this up, IO errors are only simulated within xShmMap() calls.
#
do_test walfault-11-pre-1 {
  sqlite3 db test.db
  execsql {
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 0;
    BEGIN;
      CREATE TABLE abc(a PRIMARY KEY);
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --    4
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --    8
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --   16
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --   32
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --   64
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --  128
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --  256
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   --  512
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   -- 1024
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   -- 2048
      INSERT INTO abc SELECT randomblob(1500) FROM abc;   -- 4096
    COMMIT;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-11 -faults shmerr* -prep {
  catch { db2 close }
  faultsim_restore_and_reopen
  shmfault filter xShmMap
} -body {
  db eval { SELECT count(*) FROM abc }
  sqlite3 db2 test.db -vfs shmfault
  db2 eval { PRAGMA wal_checkpoint }
  set {} {}
} -test {
  faultsim_test_result {0 {}}
}

#-------------------------------------------------------------------------
# Test the handling of the various IO/OOM/SHM errors that may occur during 
# a log recovery operation undertaken as part of a call to 
# sqlite3_wal_checkpoint().
# 
do_test walfault-12-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 0;
    BEGIN;
      CREATE TABLE abc(a PRIMARY KEY);
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-12 -prep {
  if {[info commands shmfault] == ""} {
    testvfs shmfault -default true
  }
  faultsim_restore_and_reopen
  db eval { SELECT * FROM sqlite_master }
  shmfault shm test.db [string repeat "\000" 40]
} -body {
  set rc [sqlite3_wal_checkpoint db]
  if {$rc != "SQLITE_OK"} { error [sqlite3_errmsg db] }
} -test {
  db close
  faultsim_test_result {0 {}}
}

#-------------------------------------------------------------------------
# Test simple recovery, reading and writing a database file using a 
# heap-memory wal-index.
# 
do_test walfault-13-pre-1 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 0;
    BEGIN;
      CREATE TABLE abc(a PRIMARY KEY);
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
  faultsim_save_and_close
  delete_file sv_test.db-shm
} {}

do_faultsim_test walfault-13.1 -prep {
  faultsim_restore_and_reopen
} -body {
  db eval { PRAGMA locking_mode = exclusive }
  db eval { SELECT count(*) FROM abc }
} -test {
  faultsim_test_result {0 2}
  if {[file exists test.db-shm]} { error "Not using heap-memory mode" }
  faultsim_integrity_check
}

do_faultsim_test walfault-13.2 -prep {
  faultsim_restore_and_reopen
  db eval { PRAGMA locking_mode = exclusive }
} -body {
  db eval { PRAGMA journal_mode = delete }
} -test {
  faultsim_test_result {0 delete}
  if {[file exists test.db-shm]} { error "Not using heap-memory mode" }
  faultsim_integrity_check
}

do_test walfault-13-pre-2 {
  faultsim_delete_and_reopen
  execsql {
    BEGIN;
      CREATE TABLE abc(a PRIMARY KEY);
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
  faultsim_save_and_close
} {}

do_faultsim_test walfault-13.3 -prep {
  faultsim_restore_and_reopen
} -body {
  db eval { 
    PRAGMA locking_mode = exclusive;
    PRAGMA journal_mode = WAL;
    INSERT INTO abc VALUES(randomblob(1500));
  }
} -test {
  faultsim_test_result {0 {exclusive wal}}
  if {[file exists test.db-shm]} { error "Not using heap-memory mode" }
  faultsim_integrity_check
  set nRow [db eval {SELECT count(*) FROM abc}]
  if {!(($nRow==2 && $testrc) || $nRow==3)} { error "Bad db content" }
}

#-------------------------------------------------------------------------
# Test fault-handling when wrapping around to the start of a WAL file.
#
do_test walfault-14-pre {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA journal_mode = WAL;
    BEGIN;
      CREATE TABLE abc(a PRIMARY KEY);
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-14 -prep {
  faultsim_restore_and_reopen
} -body {
  db eval { 
    PRAGMA wal_checkpoint = full;
    INSERT INTO abc VALUES(randomblob(1500));
  }
} -test {
  faultsim_test_result {0 {0 9 9}}
  faultsim_integrity_check
  set nRow [db eval {SELECT count(*) FROM abc}]
  if {!(($nRow==2 && $testrc) || $nRow==3)} { error "Bad db content" }
}

#-------------------------------------------------------------------------
# Test fault-handling when switching out of exclusive-locking mode.
#
do_test walfault-15-pre {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA journal_mode = WAL;
    BEGIN;
      CREATE TABLE abc(a PRIMARY KEY);
      INSERT INTO abc VALUES(randomblob(1500));
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
  faultsim_save_and_close
} {}
do_faultsim_test walfault-15 -prep {
  faultsim_restore_and_reopen
  execsql {
    SELECT count(*) FROM abc;
    PRAGMA locking_mode = exclusive;
    BEGIN;
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
} -body {
  db eval { 
    PRAGMA locking_mode = normal;
    BEGIN;
      INSERT INTO abc VALUES(randomblob(1500));
    COMMIT;
  }
} -test {
  faultsim_integrity_check
  set nRow [db eval {SELECT count(*) FROM abc}]
  if {$nRow!=3 && $nRow!=4} { error "Bad db content" }
}

finish_test
