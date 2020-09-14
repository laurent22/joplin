# 2010 July 28
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl

file_control_chunksize_test db main [expr 1024*1024]

do_test fallocate-1.1 {
  execsql {
    PRAGMA page_size = 1024;
    PRAGMA auto_vacuum = 1;
    CREATE TABLE t1(a, b);
  }
  file size test.db
} [expr 1*1024*1024]

do_test fallocate-1.2 {
  execsql { INSERT INTO t1 VALUES(1, zeroblob(1024*900)) }
  file size test.db
} [expr 1*1024*1024]

do_test fallocate-1.3 {
  execsql { INSERT INTO t1 VALUES(2, zeroblob(1024*900)) }
  file size test.db
} [expr 2*1024*1024]

do_test fallocate-1.4 {
  execsql { DELETE FROM t1 WHERE a = 1 }
  file size test.db
} [expr 1*1024*1024]

do_test fallocate-1.5 {
  execsql { DELETE FROM t1 WHERE a = 2 }
  file size test.db
} [expr 1*1024*1024]

do_test fallocate-1.6 {
  execsql { PRAGMA freelist_count }
} {0}

# Start a write-transaction and read the "database file size" field from
# the journal file. This field should be set to the number of pages in
# the database file based on the size of the file on disk, not the actual
# logical size of the database within the file.
#
# We need to check this to verify that if in the unlikely event a rollback
# causes a database file to grow, the database grows to its previous size
# on disk, not to the minimum size required to hold the database image.
#
do_test fallocate-1.7 {
  execsql { BEGIN; INSERT INTO t1 VALUES(1, 2); }
  if {[permutation] != "inmemory_journal"
   && [permutation] != "atomic-batch-write"
   && [atomic_batch_write test.db]==0
  } {
    hexio_get_int [hexio_read test.db-journal 16 4]
  } else {
    set {} 1024
  }
} {1024}
do_test fallocate-1.8 { execsql { COMMIT } } {}

do_test fallocate-1.8 {
  set nPg [db one {PRAGMA page_count}]
  set nFile [expr [file size test.db] / 1024]
  list [expr $nPg<100] [expr $nFile>100]
} {1 1}

do_execsql_test fallocate-1.9 {
  PRAGMA max_page_count = 100;
} {100}

#-------------------------------------------------------------------------
# The following tests - fallocate-2.* - test that things work in WAL
# mode as well.
#
set skipwaltests [expr {
  [permutation]=="journaltest" || [permutation]=="inmemory_journal"
}]
ifcapable !wal { set skipwaltests 1 }

if {!$skipwaltests} {
  db close
  forcedelete test.db
  sqlite3 db test.db
  file_control_chunksize_test db main [expr 32*1024]
  
  do_test fallocate-2.1 {
    execsql {
      PRAGMA page_size = 1024;
      PRAGMA journal_mode = WAL;
      CREATE TABLE t1(a, b);
    }
    file size test.db
  } [expr 32*1024]
  
  do_test fallocate-2.2 {
    execsql { INSERT INTO t1 VALUES(1, zeroblob(35*1024)) }
    execsql { PRAGMA wal_checkpoint }
    file size test.db
  } [expr 64*1024]
  
  do_test fallocate-2.3 {
    execsql { DELETE FROM t1 }
    execsql { VACUUM }
    file size test.db
  } [expr 64*1024]
  
  do_test fallocate-2.4 {
    execsql { PRAGMA wal_checkpoint }
    file size test.db
  } [expr 32*1024]
  
  do_test fallocate-2.5 {
    execsql { 
      INSERT INTO t1 VALUES(2, randomblob(35*1024));
      PRAGMA wal_checkpoint;
      INSERT INTO t1 VALUES(3, randomblob(128));
      DELETE FROM t1 WHERE a = 2;
      VACUUM;
    }
    file size test.db
  } [expr 64*1024]
  
  do_test fallocate-2.6 {
    sqlite3 db2 test.db
    execsql { BEGIN ; SELECT count(a) FROM t1 } db2
    execsql {  
      INSERT INTO t1 VALUES(4, randomblob(128));
      PRAGMA wal_checkpoint;
    }
    file size test.db
  } [expr 64*1024]
  
  do_test fallocate-2.7 {
    execsql { SELECT count(b) FROM t1 } db2
  } {1}
  
  do_test fallocate-2.8 {
    execsql { COMMIT } db2
    execsql { PRAGMA wal_checkpoint }
    file size test.db
  } [expr 32*1024]
}


finish_test
