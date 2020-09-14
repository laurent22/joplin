# 2008 December 15
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

source $testdir/malloc_common.tcl

set testprefix savepointfault

do_malloc_test 1 -sqlprep {
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES(1, 2, 3);
} -sqlbody {
  SAVEPOINT one;
    INSERT INTO t1 VALUES(4, 5, 6);
    SAVEPOINT two;
      DELETE FROM t1;
    ROLLBACK TO two;
  RELEASE one;
}

do_malloc_test 2 -sqlprep {
  PRAGMA cache_size = 10;
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES(randstr(400,400), randstr(400,400), randstr(400,400));
  INSERT INTO t1 SELECT 
    randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
  INSERT INTO t1 
    SELECT randstr(400,400), randstr(400,400), randstr(400,400) FROM t1;
} -sqlbody {
  PRAGMA cache_size = 10;
  SAVEPOINT one;
    DELETE FROM t1 WHERE rowid < 5;
    SAVEPOINT two;
      DELETE FROM t1 WHERE rowid > 10;
    ROLLBACK TO two;
  ROLLBACK TO one;
  RELEASE one;
}

do_ioerr_test 3 -sqlprep {
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES(1, randstr(1000,1000), randstr(1000,1000));
  INSERT INTO t1 VALUES(2, randstr(1000,1000), randstr(1000,1000));
} -sqlbody {
  BEGIN;
    UPDATE t1 SET a = 3 WHERE a = 1;
    SAVEPOINT one;
      UPDATE t1 SET a = 4 WHERE a = 2;
  COMMIT;
} -cleanup {
  db eval {
    SAVEPOINT one;
    RELEASE one;
  }
}

# The following test does a really big savepoint rollback. One involving
# more than 4000 pages. The idea is to get a specific sqlite3BitvecSet()
# operation in pagerPlaybackSavepoint() to fail.
#do_malloc_test 4 -sqlprep {
#  BEGIN;
#    CREATE TABLE t1(a, b);
#    CREATE INDEX i1 ON t1(a);
#    CREATE INDEX i2 ON t1(b);
#    INSERT INTO t1 VALUES(randstr(500,500), randstr(500,500));        --     1
#    INSERT INTO t1 VALUES(randstr(500,500), randstr(500,500));        --     2
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --     4
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --     8
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --    16
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --    32
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --    64
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --   128
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --   256
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --   512
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --  1024
#    INSERT INTO t1 SELECT randstr(500,500), randstr(500,500) FROM t1; --  2048
#  COMMIT;
#  BEGIN;
#    SAVEPOINT abc;
#      UPDATE t1 SET a = randstr(500,500);
#} -sqlbody {
#    ROLLBACK TO abc;
#}


# Cause a specific malloc in savepoint rollback code to fail.
#
do_malloc_test 4 -start 7 -sqlprep {
  PRAGMA auto_vacuum = incremental;
  PRAGMA cache_size = 1000;

  CREATE TABLE t1(a, b);
  CREATE TABLE t2(a, b);
  CREATE TABLE t3(a, b);
  INSERT INTO t1 VALUES(1, randstr(500,500));
  INSERT INTO t1 VALUES(2, randstr(500,500));
  INSERT INTO t1 VALUES(3, randstr(500,500));
  DELETE FROM t1;

  BEGIN;
    INSERT INTO t1 VALUES(1, randstr(500,500));
    INSERT INTO t1 VALUES(2, randstr(500,500));
    INSERT INTO t1 VALUES(3, randstr(500,500));
    DROP TABLE t3;                  -- Page 5 of the database file is now free.
    DROP TABLE t2;                  -- Page 4 of the database file is now free.

    SAVEPOINT abc;
      PRAGMA incremental_vacuum;
} -sqlbody {
  ROLLBACK TO abc;
}


finish_test
