#
# 2008 January 20
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
# focus of this script is the built-in RTRIM collating
# API.
#
# $Id: collateA.test,v 1.3 2008/04/15 04:02:41 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test collateA-1.1 {
  execsql {
    CREATE TABLE t1(
      a INTEGER PRIMARY KEY,
      b TEXT COLLATE BINARY,
      c TEXT COLLATE RTRIM
    );
    INSERT INTO t1 VALUES(1, 'abcde','abcde');
    INSERT INTO t1 VALUES(2, 'xyzzy ','xyzzy ');
    INSERT INTO t1 VALUES(3, 'xyzzy  ','xyzzy  ');
    INSERT INTO t1 VALUES(4, 'xyzzy   ','xyzzy   ');
    INSERT INTO t1 VALUES(5, '   ', '   ');
    INSERT INTO t1 VALUES(6, '', '');
    SELECT count(*) FROM t1;
  }
} {6}
do_test collateA-1.2 {
  execsql {SELECT a FROM t1 WHERE b='abcde     '}
} {}
do_test collateA-1.3 {
  execsql {SELECT a FROM t1 WHERE c='abcde     '}
} {1}
do_test collateA-1.4 {
  execsql {SELECT a FROM t1 WHERE b='xyzzy'}
} {}
do_test collateA-1.5 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy'}
} {2 3 4}
do_test collateA-1.6 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy '}
} {2 3 4}
do_test collateA-1.7 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy  '}
} {2 3 4}
do_test collateA-1.8 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy   '}
} {2 3 4}
do_test collateA-1.9 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy    '}
} {2 3 4}
do_test collateA-1.10 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy                                  '}
} {2 3 4}
do_test collateA-1.11 {
  execsql {SELECT 'abc123'='abc123                         ' COLLATE RTRIM;}
} {1}
do_test collateA-1.12 {
  execsql {SELECT 'abc123                         '='abc123' COLLATE RTRIM;}
} {1}
do_test collateA-1.13 {
  execsql {SELECT '  '='' COLLATE RTRIM, '  '='' COLLATE BINARY, '  '=''}
} {1 0 0}
do_test collateA-1.14 {
  execsql {SELECT ''='  ' COLLATE RTRIM, ''='  ' COLLATE BINARY, ''='  '}
} {1 0 0}
do_test collateA-1.15 {
  execsql {SELECT '  '='      ' COLLATE RTRIM, '  '='        '}
} {1 0}
do_test collateA-1.16 {
  execsql {SELECT ''<>'  ' COLLATE RTRIM, ''<>'  ' COLLATE BINARY, ''<>'  '}
} {0 1 1}
do_test collateA-1.17 {
  execsql {SELECT a FROM t1 WHERE c='xyzz'}
} {}
do_test collateA-1.18 {
  execsql {SELECT a FROM t1 WHERE c='xyzzyy   '}
} {}
do_test collateA-1.19 {
  execsql {SELECT a FROM t1 WHERE c='xyzz   '}
} {}
do_test collateA-1.20 {
  execsql {SELECT a FROM t1 WHERE c='abcd   '}
} {}
do_test collateA-1.21 {
  execsql {SELECT a FROM t1 WHERE c='abcd'}
} {}
do_test collateA-1.22 {
  execsql {SELECT a FROM t1 WHERE c='abc'}
} {}
do_test collateA-1.23 {
  execsql {SELECT a FROM t1 WHERE c='abcdef    '}
} {}
do_test collateA-1.24 {
  execsql {SELECT a FROM t1 WHERE c=''}
} {5 6}
do_test collateA-1.25 {
  execsql {SELECT a FROM t1 WHERE c=' '}
} {5 6}
do_test collateA-1.26 {
  execsql {SELECT a FROM t1 WHERE c='                    '}
} {5 6}


do_test collateA-2.1 {
  execsql {
    CREATE INDEX i1b ON t1(b);
    CREATE INDEX i1c ON t1(c);
    PRAGMA integrity_check;
  }
} {ok}
do_test collateA-2.2 {
  execsql {SELECT a FROM t1 WHERE b='abcde     '}
} {}
do_test collateA-2.3 {
  execsql {SELECT a FROM t1 WHERE c='abcde     '}
} {1}
do_test collateA-2.4 {
  execsql {SELECT a FROM t1 WHERE b='xyzzy'}
} {}
do_test collateA-2.5 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy'}
} {2 3 4}
do_test collateA-2.6 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy '}
} {2 3 4}
do_test collateA-2.7 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy  '}
} {2 3 4}
do_test collateA-2.8 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy   '}
} {2 3 4}
do_test collateA-2.9 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy    '}
} {2 3 4}
do_test collateA-2.10 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy                                  '}
} {2 3 4}
do_test collateA-2.17 {
  execsql {SELECT a FROM t1 WHERE c='xyzz'}
} {}
do_test collateA-2.18 {
  execsql {SELECT a FROM t1 WHERE c='xyzzyy   '}
} {}
do_test collateA-2.19 {
  execsql {SELECT a FROM t1 WHERE c='xyzz   '}
} {}
do_test collateA-2.20 {
  execsql {SELECT a FROM t1 WHERE c='abcd   '}
} {}
do_test collateA-2.21 {
  execsql {SELECT a FROM t1 WHERE c='abcd'}
} {}
do_test collateA-2.22 {
  execsql {SELECT a FROM t1 WHERE c='abc'}
} {}
do_test collateA-2.23 {
  execsql {SELECT a FROM t1 WHERE c='abcdef    '}
} {}
do_test collateA-2.24 {
  execsql {SELECT a FROM t1 WHERE c=''}
} {5 6}
do_test collateA-2.25 {
  execsql {SELECT a FROM t1 WHERE c=' '}
} {5 6}
do_test collateA-2.26 {
  execsql {SELECT a FROM t1 WHERE c='                    '}
} {5 6}


do_test collateA-3.1 {
  db close
  sqlite3 db test.db
  execsql {
    REINDEX;
    PRAGMA integrity_check;
  }
} {ok}
do_test collateA-3.2 {
  execsql {SELECT a FROM t1 WHERE b='abcde     '}
} {}
do_test collateA-3.3 {
  execsql {SELECT a FROM t1 WHERE c='abcde     '}
} {1}
do_test collateA-3.4 {
  execsql {SELECT a FROM t1 WHERE b='xyzzy'}
} {}
do_test collateA-3.5 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy'}
} {2 3 4}
do_test collateA-3.6 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy '}
} {2 3 4}
do_test collateA-3.7 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy  '}
} {2 3 4}
do_test collateA-3.8 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy   '}
} {2 3 4}
do_test collateA-3.9 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy    '}
} {2 3 4}
do_test collateA-3.10 {
  execsql {SELECT a FROM t1 WHERE c='xyzzy                                  '}
} {2 3 4}


finish_test
