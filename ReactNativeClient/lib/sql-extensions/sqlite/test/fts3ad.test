# 2006 October 1
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module, and in particular
# the Porter stemmer.
#
# $Id: fts3ad.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

do_test fts3ad-1.1 {
  execsql {
    CREATE VIRTUAL TABLE t1 USING fts3(content, tokenize porter);
    INSERT INTO t1(rowid, content) VALUES(1, 'running and jumping');
    SELECT rowid FROM t1 WHERE content MATCH 'run jump';
  }
} {1}
do_test fts3ad-1.2 {
  execsql {
    SELECT snippet(t1) FROM t1 WHERE t1 MATCH 'run jump';
  }
} {{<b>running</b> and <b>jumping</b>}}
do_test fts3ad-1.3 {
  execsql {
    INSERT INTO t1(rowid, content) 
          VALUES(2, 'abcdefghijklmnopqrstuvwyxz');
    SELECT rowid, snippet(t1) FROM t1 WHERE t1 MATCH 'abcdefghijqrstuvwyxz'
  }
} {2 <b>abcdefghijklmnopqrstuvwyxz</b>}
do_test fts3ad-1.4 {
  execsql {
    SELECT rowid, snippet(t1) FROM t1 WHERE t1 MATCH 'abcdefghijXXXXqrstuvwyxz'
  }
} {2 <b>abcdefghijklmnopqrstuvwyxz</b>}
do_test fts3ad-1.5 {
  execsql {
    INSERT INTO t1(rowid, content) 
          VALUES(3, 'The value is 123456789');
    SELECT rowid, snippet(t1) FROM t1 WHERE t1 MATCH '123789'
  }
} {3 {The value is <b>123456789</b>}}
do_test fts3ad-1.6 {
  execsql {
    SELECT rowid, snippet(t1) FROM t1 WHERE t1 MATCH '123000000789'
  }
} {3 {The value is <b>123456789</b>}}

do_test fts3ad-2.1 {
  execsql {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3(content, tokenize    porter);
    INSERT INTO t1(rowid, content) VALUES(1, 'running and jumping');
    SELECT rowid FROM t1 WHERE content MATCH 'run jump';
  }
} {1}
do_test fts3ad-2.2 {
  execsql {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3(content, tokenize=   porter);
    INSERT INTO t1(rowid, content) VALUES(1, 'running and jumping');
    SELECT rowid FROM t1 WHERE content MATCH 'run jump';
  }
} {1}
do_test fts3ad-2.3 {
  execsql {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3(content, tokenize=   simple);
    INSERT INTO t1(rowid, content) VALUES(1, 'running and jumping');
    SELECT rowid FROM t1 WHERE content MATCH 'run jump';
  }
} {}
do_test fts3ad-2.4 {
  execsql {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3(content,   tokenize=   porter);
    INSERT INTO t1(rowid, content) VALUES(1, 'running and jumping');
    SELECT rowid FROM t1 WHERE content MATCH 'run jump';
  }
} {1}
do_test fts3ad-2.5 {
  execsql {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3(content,	   tokenize =   porter);
    INSERT INTO t1(rowid, content) VALUES(1, 'running and jumping');
    SELECT rowid FROM t1 WHERE content MATCH 'run jump';
  }
} {1}


finish_test
