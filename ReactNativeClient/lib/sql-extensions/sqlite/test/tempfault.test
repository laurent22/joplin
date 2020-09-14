# 2016 April 11
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
# This file contains tests for fault-injection when SQLite is used with
# a temp file database.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix tempfault

# sqlite3_memdebug_vfs_oom_test 0

do_faultsim_test 1 -faults * -prep {
  sqlite3 db ""
  db eval {
    PRAGMA page_size = 1024;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
    INSERT INTO t1 VALUES(3, 4);
  }
} -body {
  execsql { INSERT INTO t1 VALUES(5, 6) }
} -test {
  faultsim_test_result {0 {}}
  set rc [catch { execsql { SELECT * FROM t1 } } msg]
  if {$rc==0 && $msg != "1 2 3 4 5 6" && $msg != "1 2 3 4"} {
    error "data mismatch 1: $msg"
  }
  if {$testrc==0 && $msg != "1 2 3 4 5 6"} {
    error "data mismatch 2: $msg"
  }
  faultsim_integrity_check
}

do_faultsim_test 2 -faults * -prep {
  sqlite3 db ""
  db eval {
    PRAGMA page_size = 1024;
    PRAGMA cache_size = 10;
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(b, a);
    WITH x(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM x WHERE i<100)
    INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM x;
  }
} -body {
  execsql { UPDATE t1 SET a = randomblob(99) }
} -test {
  faultsim_test_result {0 {}}
  faultsim_integrity_check db
}

catch { db close }
do_faultsim_test 2.1 -faults * -prep {
  if {[info commands db]==""} {
    sqlite3 db ""
    execsql {
      PRAGMA page_size = 1024;
      PRAGMA cache_size = 10;
      CREATE TABLE t1(a, b);
      CREATE INDEX i1 ON t1(b, a);
      WITH x(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM x WHERE i<100)
          INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM x;
    }
  } 
} -body {
  execsql { UPDATE t1 SET a = randomblob(99) }
} -test {
  faultsim_test_result {0 {}}
  faultsim_integrity_check db
}

do_faultsim_test 3 -faults * -prep {
  sqlite3 db ""
  db eval {
    PRAGMA page_size = 1024;
    PRAGMA cache_size = 10;
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(b, a);
    WITH x(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM x WHERE i<50)
    INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM x;
  }
} -body {
  execsql { 
    BEGIN;
      UPDATE t1 SET a = randomblob(99);
      SAVEPOINT abc;
        UPDATE t1 SET a = randomblob(98) WHERE (rowid%10)==0;
      ROLLBACK TO abc;
        UPDATE t1 SET a = randomblob(97) WHERE (rowid%5)==0;
      ROLLBACK TO abc;
    COMMIT;
  }
} -test {
  faultsim_test_result {0 {}}
  faultsim_integrity_check db
}

do_faultsim_test 4 -faults * -prep {
  sqlite3 db ""
  db eval {
    PRAGMA page_size = 1024;
    PRAGMA cache_size = 10;
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(b, a);
    WITH x(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM x WHERE i<50)
    INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM x;
  }
} -body {
  execsql { 
    BEGIN;
      UPDATE t1 SET a = randomblob(99);
      SAVEPOINT abc;
        UPDATE t1 SET a = randomblob(98) WHERE (rowid%10)==0;
      ROLLBACK TO abc;
        UPDATE t1 SET a = randomblob(97) WHERE (rowid%5)==0;
      ROLLBACK TO abc;
    COMMIT;
  }
} -test {
  faultsim_test_result {0 {}}
}

sqlite3_memdebug_vfs_oom_test 1
finish_test
