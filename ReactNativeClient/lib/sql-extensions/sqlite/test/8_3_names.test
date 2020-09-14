# 2011 May 17
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
# Test cases for the SQLITE_ENABLE_8_3_NAMES feature that forces all
# filename extensions to be limited to 3 characters.  Some embedded
# systems need this to work around microsoft FAT patents, but this
# feature should be disabled on most deployments.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !8_3_names {
  finish_test
  return
}

db close
sqlite3_shutdown
sqlite3_config_uri 1

do_test 8_3_names-1.0 {
  forcedelete test.db test.nal test.db-journal
  sqlite3 db test.db
  db eval {
    PRAGMA cache_size=10;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(20000));
    BEGIN;
    DELETE FROM t1;
    INSERT INTO t1 VALUES(randomblob(15000));
  }
  file exists test.db-journal
} 1
do_test 8_3_names-1.1 {
  file exists test.nal
} 0
do_test 8_3_names-1.2 {
  db eval {
    ROLLBACK;
    SELECT length(x) FROM t1
  }
} 20000

db close
do_test 8_3_names-2.0 {
  forcedelete test.db test.nal test.db-journal
  sqlite3 db file:./test.db?8_3_names=1
  db eval {
    PRAGMA cache_size=10;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(20000));
    BEGIN;
    DELETE FROM t1;
    INSERT INTO t1 VALUES(randomblob(15000));
  }
  file exists test.db-journal
} 0
do_test 8_3_names-2.1 {
  file exists test.nal
} 1
forcedelete test2.db test2.nal test2.db-journal
copy_file test.db test2.db
copy_file test.nal test2.nal
do_test 8_3_names-2.2 {
  db eval {
    COMMIT;
    SELECT length(x) FROM t1
  }
} 15000
do_test 8_3_names-2.3 {
  sqlite3 db2 file:./test2.db?8_3_names=1
  db2 eval {
    PRAGMA integrity_check;
    SELECT length(x) FROM t1;
  }
} {ok 20000}

db close
do_test 8_3_names-3.0 {
  forcedelete test.db test.nal test.db-journal
  sqlite3 db file:./test.db?8_3_names=0
  db eval {
    PRAGMA cache_size=10;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(20000));
    BEGIN;
    DELETE FROM t1;
    INSERT INTO t1 VALUES(randomblob(15000));
  }
  file exists test.db-journal
} 1
do_test 8_3_names-3.1 {
  file exists test.nal
} 0
forcedelete test2.db test2.nal test2.db-journal
copy_file test.db test2.db
copy_file test.db-journal test2.db-journal
do_test 8_3_names-3.2 {
  db eval {
    COMMIT;
    SELECT length(x) FROM t1
  }
} 15000
do_test 8_3_names-3.3 {
  sqlite3 db2 file:./test2.db?8_3_names=0
  db2 eval {
    PRAGMA integrity_check;
    SELECT length(x) FROM t1;
  }
} {ok 20000}

##########################################################################
# Master journals.
#
db close
forcedelete test.db test2.db
do_test 8_3_names-4.0 {
  sqlite3 db file:./test.db?8_3_names=1
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    ATTACH 'file:./test2.db?8_3_names=1' AS db2;
    CREATE TABLE db2.t2(y);
    INSERT INTO t2 VALUES(2);
    BEGIN;
      INSERT INTO t1 VALUES(3);
      INSERT INTO t2 VALUES(4);
    COMMIT;
    SELECT * FROM t1, t2 ORDER BY x, y
  }
} {1 2 1 4 3 2 3 4}
    

##########################################################################
# WAL mode.
#
ifcapable !wal {
  finish_test
  return
}
db close
forcedelete test.db
do_test 8_3_names-5.0 {
  sqlite3 db file:./test.db?8_3_names=1
  load_static_extension db wholenumber
  db eval {
    PRAGMA journal_mode=WAL;
    CREATE TABLE t1(x);
    CREATE VIRTUAL TABLE nums USING wholenumber;
    INSERT INTO t1 SELECT value FROM nums WHERE value BETWEEN 1 AND 1000;
    BEGIN;
    UPDATE t1 SET x=x*2;
  }
  sqlite3 db2 file:./test.db?8_3_names=1
  load_static_extension db2 wholenumber
  db2 eval {
    BEGIN;
    SELECT sum(x) FROM t1;
  }
} {500500}

do_test 8_3_names-5.1 {
  file exists test.db-wal
} 0
do_test 8_3_names-5.2 {
  file exists test.wal
} 1
do_test 8_3_names-5.3 {
  file exists test.db-shm
} 0
do_test 8_3_names-5.4 {
  file exists test.shm
} 1


do_test 8_3_names-5.5 {
  db eval {
    COMMIT;
    SELECT sum(x) FROM t1;
  }
} {1001000}
do_test 8_3_names-5.6 {
  db2 eval {
    SELECT sum(x) FROM t1;
  }
} {500500}


finish_test
