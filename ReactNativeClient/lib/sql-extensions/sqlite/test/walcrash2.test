# 2010 May 25
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
source $testdir/lock_common.tcl
source $testdir/wal_common.tcl
ifcapable !wal {finish_test ; return }


#-------------------------------------------------------------------------
# This test case demonstrates a flaw in the wal-index manipulation that
# existed at one point: If a process crashes mid-transaction, it may have
# already added some entries to one of the hash-tables in the wal-index.
# If the transaction were to be explicitly rolled back at this point, the
# hash-table entries would be removed as part of the rollback. However,
# if the process crashes, the transaction is implicitly rolled back and
# the rogue entries remain in the hash table.
#
# Normally, this causes no problem - readers can tell the difference 
# between committed and uncommitted entries in the hash table. However,
# if it happens often enough that all slots in the hash-table become 
# non-zero, the next process that attempts to read or write the hash
# table falls into an infinite loop.
#
# Even if run with an SQLite version affected by the bug, this test case
# only goes into an infinite loop if SQLite is compiled without SQLITE_DEBUG
# defined. If SQLITE_DEBUG is defined, the program is halted by a failing
# assert() before entering the infinite loop.
#
# walcrash2-1.1: Create a database. Commit a transaction that adds 8 frames
#                to the WAL (and 8 entry to the first hash-table in the 
#                wal-index).
#
# walcrash2-1.2: Have an external process open a transaction, add 8 entries
#                to the wal-index hash-table, then crash. Repeat this 1023
#                times (so that the wal-index contains 8192 entries - all
#                slots are non-zero).
#
# walcrash2-1.3: Using a new database connection, attempt to query the 
#                database. This should cause the process to go into the
#                infinite loop.
#
do_test walcrash2-1.1 {
  execsql {
    PRAGMA page_size = 1024;
    PRAGMA auto_vacuum = off;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    BEGIN;
      CREATE TABLE t1(x);
      CREATE TABLE t2(x);
      CREATE TABLE t3(x);
      CREATE TABLE t4(x);
      CREATE TABLE t5(x);
      CREATE TABLE t6(x);
      CREATE TABLE t7(x);
    COMMIT;
  }
  file size test.db-wal
} [wal_file_size 8 1024] 
for {set nEntry 8} {$nEntry < 8192} {incr nEntry 8} {
  do_test walcrash2-1.2.[expr $nEntry/8] {
    set C [launch_testfixture]
    testfixture $C {
      sqlite3 db test.db
      db eval {
        PRAGMA cache_size = 15;
        BEGIN;
          INSERT INTO t1 VALUES(randomblob(900));         --  1 row,  1  page
          INSERT INTO t1 SELECT * FROM t1;                --  2 rows, 3  pages
          INSERT INTO t1 SELECT * FROM t1;                --  4 rows, 5  pages
          INSERT INTO t1 SELECT * FROM t1;                --  8 rows, 9  pages
          INSERT INTO t1 SELECT * FROM t1;                -- 16 rows, 17 pages
          INSERT INTO t1 SELECT * FROM t1 LIMIT 3;        -- 20 rows, 20 pages
      }
    } 
    close $C
    file size test.db-wal
  } [wal_file_size 16 1024]
}
do_test walcrash2-1.3 {
  sqlite3 db2 test.db
  execsql { SELECT count(*) FROM t1 } db2
} {0}
catch { db2 close }

finish_test
