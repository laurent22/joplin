# 2005 August 24
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
# focus of this script is a test of the DELETE command where a
# large number of rows are deleted.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Create a table that contains a large number of rows.
#
do_test delete3-1.1 {
  execsql {
    CREATE TABLE t1(x integer primary key);
    BEGIN;
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 SELECT x+2 FROM t1;
    INSERT INTO t1 SELECT x+4 FROM t1;
    INSERT INTO t1 SELECT x+8 FROM t1;
    INSERT INTO t1 SELECT x+16 FROM t1;
    INSERT INTO t1 SELECT x+32 FROM t1;
    INSERT INTO t1 SELECT x+64 FROM t1;
    INSERT INTO t1 SELECT x+128 FROM t1;
    INSERT INTO t1 SELECT x+256 FROM t1;
    INSERT INTO t1 SELECT x+512 FROM t1;
    INSERT INTO t1 SELECT x+1024 FROM t1;
    INSERT INTO t1 SELECT x+2048 FROM t1;
    INSERT INTO t1 SELECT x+4096 FROM t1;
    INSERT INTO t1 SELECT x+8192 FROM t1;
    INSERT INTO t1 SELECT x+16384 FROM t1;
    INSERT INTO t1 SELECT x+32768 FROM t1;
    INSERT INTO t1 SELECT x+65536 FROM t1;
    INSERT INTO t1 SELECT x+131072 FROM t1;
    INSERT INTO t1 SELECT x+262144 FROM t1;
    COMMIT;
    SELECT count(*) FROM t1;	
  }
} {524288}
do_test delete3-1.2 {
  execsql {
    DELETE FROM t1 WHERE x%2==0;
    SELECT count(*) FROM t1;
  }
} {262144}
integrity_check delete3-1.3

finish_test
