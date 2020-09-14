# 2008 August 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. 
# Specifically, it tests the behavior of the sqlite3VdbeRecordCompare()
# routine in cases where the rowid is 0 or 1 in file format 4
# (meaning that the rowid has type code 8 or 9 with zero bytes of
# data).  Ticket #3292.
#
# $Id: tkt3292.test,v 1.1 2008/08/13 14:07:41 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3292-1.1 {
  sqlite3_db_config db LEGACY_FILE_FORMAT 0
  execsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b INT);
    INSERT INTO t1 VALUES(0, 1);
    INSERT INTO t1 VALUES(1, 1);
    INSERT INTO t1 VALUES(2, 1);
    CREATE INDEX i1 ON t1(b);
    SELECT * FROM t1 WHERE b>=1;
  }
} {0 1 1 1 2 1}
do_test tkt3292-1.2 {
  execsql {
    INSERT INTO t1 VALUES(3, 0);
    INSERT INTO t1 VALUES(4, 2);
    SELECT * FROM t1 WHERE b>=1;
  }
} {0 1 1 1 2 1 4 2}


do_test tkt3292-2.1 {
  execsql {
    CREATE TABLE t2(a INTEGER PRIMARY KEY, b, c, d);
    INSERT INTO t2 VALUES(0, 1, 'hello', x'012345');
    INSERT INTO t2 VALUES(1, 1, 'hello', x'012345');
    INSERT INTO t2 VALUES(2, 1, 'hello', x'012345');
    CREATE INDEX i2 ON t2(b,c,d);
    SELECT a FROM t2 WHERE b=1 AND c='hello' AND d>=x'012345';
  }
} {0 1 2}
do_test tkt3292-2.2 {
  execsql {
    INSERT INTO t2 VALUES(3, 1, 'hello', x'012344');
    INSERT INTO t2 VALUES(4, 1, 'hello', x'012346');
    SELECT a FROM t2 WHERE b=1 AND c='hello' AND d>=x'012345';
  }
} {0 1 2 4}


finish_test
