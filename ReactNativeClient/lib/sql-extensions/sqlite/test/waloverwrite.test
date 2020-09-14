# 2010 May 5
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
source $testdir/wal_common.tcl
set testprefix waloverwrite

ifcapable !wal {finish_test ; return }

# Simple test:
#
# Test cases *.1 - *.6:
#
#   + Create a database of blobs roughly 50 pages in size.
#
#   + Set the db cache size to something much smaller than this (5 pages)
#
#   + Within a transaction, loop through the set of blobs 5 times. Update
#      each blob as it is visited.
#
#   + Test that the wal file is roughly 50 pages in size - even though many
#      database pages have been written to it multiple times.
#
#   + Take a copy of the database and wal file. Test that recovery can
#     be run on it.
#
# Test cases *.7 - *.9:
#
#   + Same thing, but before committing the statement transaction open
#     a SAVEPOINT, update the blobs another 5 times, then roll it back.
#
#   + Check that if recovery is run on the resulting wal file, the rolled
#     back changes from within the SAVEPOINT are not present in the db.
#
# The above is run twice - once where the wal file is empty at the start of
# step 3 (tn==1) and once where it already contains a transaction (tn==2).
#
foreach {tn xtra} {
  1 {}
  2 { UPDATE t1 SET y = randomblob(799) WHERE x=4 }
} {
  reset_db
  do_execsql_test 1.$tn.0 {
    CREATE TABLE t1(x, y);
    CREATE TABLE t2(x, y);
    CREATE INDEX i1y ON t1(y);
  
    WITH cnt(i) AS (
      SELECT 1 UNION ALL SELECT i+1 FROM cnt WHERE i<20
    )
    INSERT INTO t1 SELECT i, randomblob(800) FROM cnt;
  } {}
  
  do_test 1.$tn.1 {
    set nPg [db one { PRAGMA page_count } ]
    expr $nPg>40 && $nPg<50
  } {1}
  
  do_test 1.$tn.2 {
    db close
    sqlite3 db test.db
  
    execsql {PRAGMA journal_mode = wal}
    execsql {PRAGMA cache_size = 5}
    execsql $xtra
  
    db transaction {
      for {set i 0} {$i < 5} {incr i} {
        foreach x [db eval {SELECT x FROM t1}] {
          execsql { UPDATE t1 SET y = randomblob(799) WHERE x=$x }
        }
      }
    }
  
    set nPg [wal_frame_count test.db-wal 1024]
    expr $nPg>40 && $nPg<60
  } {1}
  
  do_execsql_test 1.$tn.3 { PRAGMA integrity_check } ok
  
  do_test 1.$tn.4 {
    forcedelete test.db2 test.db2-wal
    forcecopy test.db test.db2
    sqlite3 db2 test.db2
    execsql { SELECT sum(length(y)) FROM t1 } db2
  } [expr 20*800]
  
  do_test 1.$tn.5 {
    db2 close
    forcecopy test.db test.db2
    forcecopy test.db-wal test.db2-wal
    sqlite3 db2 test.db2
    execsql { SELECT sum(length(y)) FROM t1 } db2
  } [expr 20*799]
  
  do_test 1.$tn.6 {
    execsql { PRAGMA integrity_check } db2
  } ok
  db2 close

  do_test 1.$tn.7 {
    execsql { PRAGMA wal_checkpoint }
    db transaction {
      for {set i 0} {$i < 1} {incr i} {
        foreach x [db eval {SELECT x FROM t1}] {
          execsql { UPDATE t1 SET y = randomblob(798) WHERE x=$x }
        }
      }

      execsql {
        WITH cnt(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM cnt WHERE i<20)
        INSERT INTO t2 SELECT i, randomblob(800) FROM cnt;
      }

      execsql {SAVEPOINT abc}
      for {set i 0} {$i < 5} {incr i} {
        foreach x [db eval {SELECT x FROM t1}] {
          execsql { UPDATE t1 SET y = randomblob(797) WHERE x=$x }
        }
      }
      execsql {ROLLBACK TO abc}

    }

    set nPg [wal_frame_count test.db-wal 1024]
    expr $nPg>55 && $nPg<75
  } {1}

  do_test 1.$tn.8 {
    forcedelete test.db2 test.db2-wal
    forcecopy test.db test.db2
    sqlite3 db2 test.db2
    execsql { SELECT sum(length(y)) FROM t1 } db2
  } [expr 20*799]

  do_test 1.$tn.9 {
    db2 close
    forcecopy test.db-wal test.db2-wal
    sqlite3 db2 test.db2
    execsql { SELECT sum(length(y)) FROM t1 } db2
  } [expr 20*798]

  do_test 1.$tn.10 {
    execsql { PRAGMA integrity_check } db2
  } ok
  db2 close
}

finish_test
