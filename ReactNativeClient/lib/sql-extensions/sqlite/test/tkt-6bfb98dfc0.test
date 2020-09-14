# 2013 March 27
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [6bfb98dfc0]
#
# The final INSERT in the script below reports that the database is
# corrupt (SQLITE_CORRUPT) and aborts even though the database is not
# corrupt.
#
#    PRAGMA page_size=512;
#    CREATE TABLE t1(x INTEGER PRIMARY KEY, y);
#    INSERT INTO t1 VALUES(1,randomblob(400));
#    INSERT INTO t1 VALUES(2,randomblob(400));
#    INSERT INTO t1 SELECT x+2, randomblob(400) FROM t1;
#    INSERT INTO t1 SELECT x+4, randomblob(400) FROM t1;
#    INSERT INTO t1 SELECT x+8, randomblob(400) FROM t1;
#    INSERT INTO t1 SELECT x+16, randomblob(400) FROM t1;
#    INSERT INTO t1 SELECT x+32, randomblob(400) FROM t1;
#    INSERT INTO t1 SELECT x+64, randomblob(400) FROM t1 WHERE x<10;
#    CREATE TRIGGER r1 AFTER INSERT ON t1 WHEN new.x=74 BEGIN
#      DELETE FROM t1;
#      INSERT INTO t1 VALUES(75, randomblob(400));
#      INSERT INTO t1 VALUES(76, randomblob(400));
#    END;
#    INSERT INTO t1 VALUES(74, randomblob(400));
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-6bfb98dfc0.100 {
  db eval {
    PRAGMA page_size=512;
    CREATE TABLE t1(x INTEGER PRIMARY KEY, y);
    INSERT INTO t1 VALUES(1,randomblob(400));
    INSERT INTO t1 VALUES(2,randomblob(400));
    INSERT INTO t1 SELECT x+2, randomblob(400) FROM t1;
    INSERT INTO t1 SELECT x+4, randomblob(400) FROM t1;
    INSERT INTO t1 SELECT x+8, randomblob(400) FROM t1;
    INSERT INTO t1 SELECT x+16, randomblob(400) FROM t1;
    INSERT INTO t1 SELECT x+32, randomblob(400) FROM t1;
    INSERT INTO t1 SELECT x+64, randomblob(400) FROM t1 WHERE x<10;
    CREATE TRIGGER r1 AFTER INSERT ON t1 WHEN new.x=74 BEGIN
      DELETE FROM t1;
      INSERT INTO t1 VALUES(75, randomblob(400));
      INSERT INTO t1 VALUES(76, randomblob(400));
    END;
    INSERT INTO t1 VALUES(74, randomblob(400));
    SELECT x, length(y) FROM t1 ORDER BY x;
  }
} {75 400 76 400}
    
finish_test
