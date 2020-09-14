# 2010 February 8
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
# focus of this file is testing the operation of the library when
# recovering a database following a simulated system failure in 
# "PRAGMA journal_mode=WAL" mode.
#

#
# These are 'warm-body' tests of database recovery used while developing 
# the WAL code. They serve to prove that a few really simple cases work:
#
# walcrash-1.*: Recover a database.
# walcrash-2.*: Recover a database where the failed transaction spanned more
#               than one page.
# walcrash-3.*: Recover multiple databases where the failed transaction 
#               was a multi-file transaction.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !wal {finish_test ; return }

db close

set seed 0
set REPEATS 100

# walcrash-1.*
#
for {set i 1} {$i < $REPEATS} {incr i} {
  forcedelete test.db test.db-wal
  do_test walcrash-1.$i.1 {
    crashsql -delay 4 -file test.db-wal -seed [incr seed] {
      PRAGMA journal_mode = WAL;
      CREATE TABLE t1(a, b);
      INSERT INTO t1 VALUES(1, 1);
      INSERT INTO t1 VALUES(2, 3);
      INSERT INTO t1 VALUES(3, 6);
    }
  } {1 {child process exited abnormally}}
  do_test walcrash-1.$i.2 {
    sqlite3 db test.db
    execsql { SELECT sum(a)==max(b) FROM t1 }
  } {1}
  integrity_check walcrash-1.$i.3
  db close
  
  do_test walcrash-1.$i.4 {
    crashsql -delay 2 -file test.db-wal -seed [incr seed] {
      INSERT INTO t1 VALUES(4, (SELECT sum(a) FROM t1) + 4);
      INSERT INTO t1 VALUES(5, (SELECT sum(a) FROM t1) + 5);
    }
  } {1 {child process exited abnormally}}
  do_test walcrash-1.$i.5 {
    sqlite3 db test.db
    execsql { SELECT sum(a)==max(b) FROM t1 }
  } {1}
  integrity_check walcrash-1.$i.6
  do_test walcrash-1.$i.7 {
    execsql { PRAGMA main.journal_mode }
  } {wal}
  db close
}

# walcrash-2.*
#
for {set i 1} {$i < $REPEATS} {incr i} {
  forcedelete test.db test.db-wal
  do_test walcrash-2.$i.1 {
    crashsql -delay 5 -file test.db-wal -seed [incr seed] {
      PRAGMA journal_mode = WAL;
      CREATE TABLE t1(a PRIMARY KEY, b);
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t1 VALUES(3, 4);
      INSERT INTO t1 VALUES(5, 9);
    }
  } {1 {child process exited abnormally}}
  do_test walcrash-2.$i.2 {
    sqlite3 db test.db
    execsql { SELECT sum(a)==max(b) FROM t1 }
  } {1}
  integrity_check walcrash-2.$i.3
  db close
  
  do_test walcrash-2.$i.4 {
    crashsql -delay 2 -file test.db-wal -seed [incr seed] {
      INSERT INTO t1 VALUES(6, (SELECT sum(a) FROM t1) + 6);
      INSERT INTO t1 VALUES(7, (SELECT sum(a) FROM t1) + 7);
    }
  } {1 {child process exited abnormally}}
  do_test walcrash-2.$i.5 {
    sqlite3 db test.db
    execsql { SELECT sum(a)==max(b) FROM t1 }
  } {1}
  integrity_check walcrash-2.$i.6
  do_test walcrash-2.$i.6 {
    execsql { PRAGMA main.journal_mode }
  } {wal}
  db close
}

# walcrash-3.*
#
# for {set i 1} {$i < $REPEATS} {incr i} {
#   forcedelete test.db test.db-wal
#   forcedelete test2.db test2.db-wal
# 
#   do_test walcrash-3.$i.1 {
#     crashsql -delay 2 -file test2.db-wal -seed [incr seed] {
#       PRAGMA journal_mode = WAL;
#       ATTACH 'test2.db' AS aux;
#       CREATE TABLE t1(a PRIMARY KEY, b);
#       CREATE TABLE aux.t2(a PRIMARY KEY, b);
#       BEGIN;
#         INSERT INTO t1 VALUES(1, 2);
#         INSERT INTO t2 VALUES(1, 2);
#       COMMIT;
#     }
#   } {1 {child process exited abnormally}}
# 
#   do_test walcrash-3.$i.2 {
#     sqlite3_wal db test.db
#     execsql { 
#       ATTACH 'test2.db' AS aux;
#       SELECT * FROM t1 EXCEPT SELECT * FROM t2;
#     }
#   } {}
#   do_test walcrash-3.$i.3 { execsql { PRAGMA main.integrity_check } } {ok}
#   do_test walcrash-3.$i.4 { execsql { PRAGMA aux.integrity_check  } } {ok}
# 
#   db close
# }

# walcrash-4.*
#
for {set i 1} {$i < $REPEATS} {incr i} {
  forcedelete test.db test.db-wal
  forcedelete test2.db test2.db-wal

  do_test walcrash-4.$i.1 {
    crashsql -delay 4 -file test.db-wal -seed [incr seed] -blocksize 4096 {
      PRAGMA journal_mode = WAL;
      PRAGMA page_size = 1024;
      CREATE TABLE t1(a PRIMARY KEY, b);
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t1 VALUES(3, 4);
    }
  } {1 {child process exited abnormally}}

  do_test walcrash-4.$i.2 {
    sqlite3 db test.db
    execsql { 
      SELECT * FROM t1 WHERE a = 1;
    }
  } {1 2}
  do_test walcrash-4.$i.3 { execsql { PRAGMA main.integrity_check } } {ok}
  do_test walcrash-4.$i.4 { execsql { PRAGMA main.journal_mode } } {wal}

  db close
}

# walcrash-5.*
#
for {set i 1} {$i < $REPEATS} {incr i} {
  forcedelete test.db test.db-wal
  forcedelete test2.db test2.db-wal

  do_test walcrash-5.$i.1 {
    crashsql -delay 13 -file test.db-wal -seed [incr seed] -blocksize 4096 {
      PRAGMA journal_mode = WAL;
      PRAGMA page_size = 1024;
      BEGIN;
        CREATE TABLE t1(x PRIMARY KEY);
        INSERT INTO t1 VALUES(randomblob(900));
        INSERT INTO t1 VALUES(randomblob(900));
        INSERT INTO t1 SELECT randomblob(900) FROM t1;           /* 4 */
      COMMIT;
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 8 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 12 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 16 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 20 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 24 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 28 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 32 */

      PRAGMA wal_checkpoint;
      INSERT INTO t1 VALUES(randomblob(900));
      INSERT INTO t1 VALUES(randomblob(900));
      INSERT INTO t1 VALUES(randomblob(900));
    }
  } {1 {child process exited abnormally}}

  do_test walcrash-5.$i.2 {
    sqlite3 db test.db
    execsql { SELECT count(*)==33 OR count(*)==34 FROM t1 WHERE x != 1 }
  } {1}
  do_test walcrash-5.$i.3 { execsql { PRAGMA main.integrity_check } } {ok}
  do_test walcrash-5.$i.4 { execsql { PRAGMA main.journal_mode } } {wal}

  db close
}

# walcrash-6.*
#
for {set i 1} {$i < $REPEATS} {incr i} {
  forcedelete test.db test.db-wal
  forcedelete test2.db test2.db-wal

  do_test walcrash-6.$i.1 {
    crashsql -delay 14 -file test.db-wal -seed [incr seed] -blocksize 512 {
      PRAGMA journal_mode = WAL;
      PRAGMA page_size = 1024;
      BEGIN;
        CREATE TABLE t1(x PRIMARY KEY);
        INSERT INTO t1 VALUES(randomblob(900));
        INSERT INTO t1 VALUES(randomblob(900));
        INSERT INTO t1 SELECT randomblob(900) FROM t1;           /* 4 */
      COMMIT;
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 8 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 12 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 16 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 20 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 24 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 28 */
      INSERT INTO t1 SELECT randomblob(900) FROM t1 LIMIT 4;   /* 32 */

      PRAGMA wal_checkpoint;
      INSERT INTO t1 VALUES(randomblob(9000));
      INSERT INTO t1 VALUES(randomblob(9000));
      INSERT INTO t1 VALUES(randomblob(9000));
      INSERT INTO t1 VALUES(randomblob(9000));
    }
  } {1 {child process exited abnormally}}

  do_test walcrash-6.$i.2 {
    sqlite3 db test.db
    execsql { SELECT count(*) BETWEEN 34 AND 36 FROM t1 WHERE x != 1 }
  } {1}
  do_test walcrash-6.$i.3 { execsql { PRAGMA main.integrity_check } } {ok}
  do_test walcrash-6.$i.4 { execsql { PRAGMA main.journal_mode } } {wal}

  db close
}

#-------------------------------------------------------------------------
# This test case simulates a crash while checkpointing the database. Page
# 1 is one of the pages overwritten by the checkpoint. This is a special
# case because it means the content of page 1 may be damaged. SQLite will
# have to determine:
#
#   (a) that the database is a WAL database, and 
#   (b) the database page-size
#
# based on the log file.
#
for {set i 1} {$i < $REPEATS} {incr i} {
  forcedelete test.db test.db-wal

  # Select a page-size for this test.
  #
  set pgsz [lindex {512 1024 2048 4096 8192 16384} [expr $i%6]]

  do_test walcrash-7.$i.1 {
    crashsql -delay 3 -file test.db -seed [incr seed] -blocksize 512 "
      PRAGMA page_size = $pgsz;
      PRAGMA journal_mode = wal;
      BEGIN;
        CREATE TABLE t1(a, b);
        INSERT INTO t1 VALUES(1, 2);
      COMMIT;
      PRAGMA wal_checkpoint;
      CREATE INDEX i1 ON t1(a);
      PRAGMA wal_checkpoint;
    "
  } {1 {child process exited abnormally}}

  do_test walcrash-7.$i.2 {
    sqlite3 db test.db
    execsql { SELECT b FROM t1 WHERE a = 1 }
  } {2}
  do_test walcrash-7.$i.3 { execsql { PRAGMA main.integrity_check } } {ok}
  do_test walcrash-7.$i.4 { execsql { PRAGMA main.journal_mode } } {wal}

  db close
}

finish_test
