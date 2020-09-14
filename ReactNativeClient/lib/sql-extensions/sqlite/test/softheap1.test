# 2007 Aug 10
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
# This test script reproduces the problem reported by ticket #2565,
# A database corruption bug that occurs in auto_vacuum mode when
# the soft_heap_limit is set low enough to be triggered.
#
# $Id: softheap1.test,v 1.5 2008/07/08 17:13:59 danielk1977 Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !integrityck {
  finish_test
  return
}

# EVIDENCE-OF: R-26343-45930 This pragma invokes the
# sqlite3_soft_heap_limit64() interface with the argument N, if N is
# specified and is a non-negative integer.
#
# EVIDENCE-OF: R-64451-07163 The soft_heap_limit pragma always returns
# the same integer that would be returned by the
# sqlite3_soft_heap_limit64(-1) C-language function.
#
do_test softheap1-1.0 {
  execsql {PRAGMA soft_heap_limit}
} [sqlite3_soft_heap_limit -1]
do_test softheap1-1.1 {
  execsql {PRAGMA soft_heap_limit=123456; PRAGMA soft_heap_limit;}
} {123456 123456}
do_test softheap1-1.2 {
  sqlite3_soft_heap_limit -1
} {123456}
do_test softheap1-1.3 {
  execsql {PRAGMA soft_heap_limit(-1); PRAGMA soft_heap_limit;}
} {123456 123456}
do_test softheap1-1.4 {
  execsql {PRAGMA soft_heap_limit(0); PRAGMA soft_heap_limit;}
} {0 0}

sqlite3_soft_heap_limit 5000
do_test softheap1-2.0 {
  execsql {PRAGMA soft_heap_limit}
} {5000}
do_test softheap1-2.1 {
  execsql {
    PRAGMA auto_vacuum=1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(hex(randomblob(1000)));
    BEGIN;
  }
  execsql {
    CREATE TABLE t2 AS SELECT * FROM t1;
  }
  execsql {
    ROLLBACK;
  }
  execsql {
    PRAGMA integrity_check;
  }
} {ok}

sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)
finish_test
