# 2011 July 9
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
# focus of this file is testing the CREATE INDEX statement.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set testprefix index4

do_execsql_test 1.1 {
  BEGIN;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(102));
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --     2
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --     4
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --     8
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --    16
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --    32
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --    64
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --   128
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --   256
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --   512
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --  1024
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --  2048
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --  4096
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     --  8192
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     -- 16384
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     -- 32768
    INSERT INTO t1 SELECT randomblob(102) FROM t1;     -- 65536
  COMMIT;
}

do_execsql_test 1.2 {
  CREATE INDEX i1 ON t1(x);
}
do_execsql_test 1.3 {
  PRAGMA integrity_check 
} {ok}

# The same test again - this time with limited memory.
#
ifcapable memorymanage {
  set soft_limit [sqlite3_soft_heap_limit 50000]

  db close
  sqlite3 db test.db

  do_execsql_test 1.4 {
    PRAGMA cache_size = 10;
    CREATE INDEX i2 ON t1(x);
  }
  do_execsql_test 1.5 {
    PRAGMA integrity_check 
  } {ok}

  sqlite3_soft_heap_limit $soft_limit
}


do_execsql_test 1.6 {
  BEGIN;
    DROP TABLE t1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES('a');
    INSERT INTO t1 VALUES('b');
    INSERT INTO t1 VALUES('c');
    INSERT INTO t1 VALUES('d');
    INSERT INTO t1 VALUES('e');
    INSERT INTO t1 VALUES('f');
    INSERT INTO t1 VALUES('g');
    INSERT INTO t1 VALUES(NULL);
    INSERT INTO t1 SELECT randomblob(1202) FROM t1;     --    16
    INSERT INTO t1 SELECT randomblob(2202) FROM t1;     --    32
    INSERT INTO t1 SELECT randomblob(3202) FROM t1;     --    64
    INSERT INTO t1 SELECT randomblob(4202) FROM t1;     --   128
    INSERT INTO t1 SELECT randomblob(5202) FROM t1;     --   256
  COMMIT;
  CREATE INDEX i1 ON t1(x); 
  PRAGMA integrity_check
} {ok}

do_execsql_test 1.7 {
  BEGIN;
    DROP TABLE t1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES('a');
  COMMIT;
  CREATE INDEX i1 ON t1(x); 
  PRAGMA integrity_check
} {ok}

do_execsql_test 1.8 {
  BEGIN;
    DROP TABLE t1;
    CREATE TABLE t1(x);
  COMMIT;
  CREATE INDEX i1 ON t1(x); 
  PRAGMA integrity_check
} {ok}

do_execsql_test 2.1 {
  BEGIN;
    CREATE TABLE t2(x);
    INSERT INTO t2 VALUES(14);
    INSERT INTO t2 VALUES(35);
    INSERT INTO t2 VALUES(15);
    INSERT INTO t2 VALUES(35);
    INSERT INTO t2 VALUES(16);
  COMMIT;
}
do_catchsql_test 2.2 {
  CREATE UNIQUE INDEX i3 ON t2(x);
} {1 {UNIQUE constraint failed: t2.x}}


finish_test
