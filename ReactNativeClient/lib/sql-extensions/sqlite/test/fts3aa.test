# 2006 September 9
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
# focus of this script is testing the FTS3 module.
#
# $Id: fts3aa.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts3aa

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Construct a full-text search table containing five keywords:
# one, two, three, four, and five, in various combinations.  The
# rowid for each will be a bitmask for the elements it contains.
#
db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(content);
  INSERT INTO t1(content) VALUES('one');
  INSERT INTO t1(content) VALUES('two');
  INSERT INTO t1(content) VALUES('one two');
  INSERT INTO t1(content) VALUES('three');
  INSERT INTO t1(content) VALUES('one three');
  INSERT INTO t1(content) VALUES('two three');
  INSERT INTO t1(content) VALUES('one two three');
  INSERT INTO t1(content) VALUES('four');
  INSERT INTO t1(content) VALUES('one four');
  INSERT INTO t1(content) VALUES('two four');
  INSERT INTO t1(content) VALUES('one two four');
  INSERT INTO t1(content) VALUES('three four');
  INSERT INTO t1(content) VALUES('one three four');
  INSERT INTO t1(content) VALUES('two three four');
  INSERT INTO t1(content) VALUES('one two three four');
  INSERT INTO t1(content) VALUES('five');
  INSERT INTO t1(content) VALUES('one five');
  INSERT INTO t1(content) VALUES('two five');
  INSERT INTO t1(content) VALUES('one two five');
  INSERT INTO t1(content) VALUES('three five');
  INSERT INTO t1(content) VALUES('one three five');
  INSERT INTO t1(content) VALUES('two three five');
  INSERT INTO t1(content) VALUES('one two three five');
  INSERT INTO t1(content) VALUES('four five');
  INSERT INTO t1(content) VALUES('one four five');
  INSERT INTO t1(content) VALUES('two four five');
  INSERT INTO t1(content) VALUES('one two four five');
  INSERT INTO t1(content) VALUES('three four five');
  INSERT INTO t1(content) VALUES('one three four five');
  INSERT INTO t1(content) VALUES('two three four five');
  INSERT INTO t1(content) VALUES('one two three four five');
}

do_test fts3aa-1.1 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one'}
} {1 3 5 7 9 11 13 15 17 19 21 23 25 27 29 31}
do_test fts3aa-1.2 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one two'}
} {3 7 11 15 19 23 27 31}
do_test fts3aa-1.3 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'two one'}
} {3 7 11 15 19 23 27 31}
do_test fts3aa-1.4 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one two three'}
} {7 15 23 31}
do_test fts3aa-1.5 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one three two'}
} {7 15 23 31}
do_test fts3aa-1.6 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'two three one'}
} {7 15 23 31}
do_test fts3aa-1.7 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'two one three'}
} {7 15 23 31}
do_test fts3aa-1.8 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'three one two'}
} {7 15 23 31}
do_test fts3aa-1.9 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'three two one'}
} {7 15 23 31}
do_test fts3aa-1.10 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one two THREE'}
} {7 15 23 31}
do_test fts3aa-1.11 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '  ONE    Two   three  '}
} {7 15 23 31}

do_test fts3aa-2.1 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one"'}
} {1 3 5 7 9 11 13 15 17 19 21 23 25 27 29 31}
do_test fts3aa-2.2 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one two"'}
} {3 7 11 15 19 23 27 31}
do_test fts3aa-2.3 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"two one"'}
} {}
do_test fts3aa-2.4 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one two three"'}
} {7 15 23 31}
do_test fts3aa-2.5 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one three two"'}
} {}
do_test fts3aa-2.6 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one two three four"'}
} {15 31}
do_test fts3aa-2.7 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one three two four"'}
} {}
do_test fts3aa-2.8 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one three five"'}
} {21}
do_test fts3aa-2.9 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one three" five'}
} {21 29}
do_test fts3aa-2.10 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'five "one three"'}
} {21 29}
do_test fts3aa-2.11 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'five "one three" four'}
} {29}
do_test fts3aa-2.12 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'five four "one three"'}
} {29}
do_test fts3aa-2.13 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one three" four five'}
} {29}

do_test fts3aa-3.1 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one'}
} {1 3 5 7 9 11 13 15 17 19 21 23 25 27 29 31}
do_test fts3aa-3.2 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one -two'}
} {1 5 9 13 17 21 25 29}
do_test fts3aa-3.3 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '-two one'}
} {1 5 9 13 17 21 25 29}

do_test fts3aa-4.1 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one OR two'}
} {1 2 3 5 6 7 9 10 11 13 14 15 17 18 19 21 22 23 25 26 27 29 30 31}
do_test fts3aa-4.2 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH '"one two" OR three'}
} {3 4 5 6 7 11 12 13 14 15 19 20 21 22 23 27 28 29 30 31}
do_test fts3aa-4.3 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'three OR "one two"'}
} {3 4 5 6 7 11 12 13 14 15 19 20 21 22 23 27 28 29 30 31}
do_test fts3aa-4.4 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one two OR three'}
} {3 5 7 11 13 15 19 21 23 27 29 31}
do_test fts3aa-4.5 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'three OR two one'}
} {3 5 7 11 13 15 19 21 23 27 29 31}
do_test fts3aa-4.6 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'one two OR three OR four'}
} {3 5 7 9 11 13 15 19 21 23 25 27 29 31}
do_test fts3aa-4.7 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH 'two OR three OR four one'}
} {3 5 7 9 11 13 15 19 21 23 25 27 29 31}

# Test the ability to handle NULL content
#
do_test fts3aa-5.1 {
  execsql {INSERT INTO t1(content) VALUES(NULL)}
} {}
do_test fts3aa-5.2 {
  set rowid [db last_insert_rowid]
  execsql {SELECT content FROM t1 WHERE rowid=$rowid}
} {{}}
do_test fts3aa-5.3 {
  execsql {SELECT rowid FROM t1 WHERE content MATCH NULL}
} {}

# Test the ability to handle non-positive rowids
#
do_test fts3aa-6.0 {
  execsql {INSERT INTO t1(rowid, content) VALUES(0, 'four five')}
} {}
do_test fts3aa-6.1 {
  execsql {SELECT content FROM t1 WHERE rowid = 0}
} {{four five}}
do_test fts3aa-6.2 {
  execsql {INSERT INTO t1(rowid, content) VALUES(-1, 'three four')}
} {}
do_test fts3aa-6.3 {
  execsql {SELECT content FROM t1 WHERE rowid = -1}
} {{three four}}
do_test fts3aa-6.4 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'four'}
} {-1 0 8 9 10 11 12 13 14 15 24 25 26 27 28 29 30 31}

# Test creation of FTS3 and FTS4 tables with columns that contain
# an "=" character.
#
do_execsql_test fts3aa-7.1 {
  CREATE VIRTUAL TABLE t2 USING fts3(xyz=abc);
  SELECT xyz FROM t2;
} {}
do_catchsql_test fts3aa-7.2 {
  CREATE VIRTUAL TABLE t3 USING fts4(xyz=abc);
} {1 {unrecognized parameter: xyz=abc}}
do_catchsql_test fts3aa-7.3 {
  CREATE VIRTUAL TABLE t3 USING fts4(xyz = abc);
} {1 {unrecognized parameter: xyz = abc}}

do_execsql_test fts3aa-7.4 {
  CREATE VIRTUAL TABLE t3 USING fts3(tokenize=simple, tokenize=simple);
  SELECT tokenize FROM t3;
} {}
do_catchsql_test fts3aa-7.5 {
  CREATE VIRTUAL TABLE t4 USING fts4(tokenize=simple, tokenize=simple);
} {1 {unrecognized parameter: tokenize=simple}}

do_execsql_test 8.0 {
  CREATE VIRTUAL TABLE t0 USING fts4(order=desc);
  BEGIN;
  INSERT INTO t0(rowid, content) VALUES(1, 'abc');
  UPDATE t0 SET docid=5 WHERE docid=1;
  INSERT INTO t0(rowid, content) VALUES(6, 'abc');
}
do_execsql_test 8.1 {
  SELECT docid FROM t0 WHERE t0 MATCH 'abc';
} {6 5}
do_execsql_test 8.2 {
  SELECT docid FROM t0 WHERE t0 MATCH '"abc abc"';
} {}
do_execsql_test 8.3 { COMMIT }
do_execsql_test 8.4 {
  SELECT docid FROM t0 WHERE t0 MATCH 'abc';
} {6 5}
do_execsql_test 8.5 {
  SELECT docid FROM t0 WHERE t0 MATCH '"abc abc"';
} {}

do_execsql_test 9.1 {
  CREATE VIRTUAL TABLE t9 USING fts4(a, "", '---');
}
do_execsql_test 9.2 {
  CREATE VIRTUAL TABLE t10 USING fts3(<, b, c);
}

do_execsql_test 10.0 {
  CREATE VIRTUAL TABLE z1 USING fts3;
  INSERT INTO z1 VALUES('one two three'),('four one five'),('six two five');
  CREATE TRIGGER z1r1 AFTER DELETE ON z1_content BEGIN
    DELETE FROM z1;
  END;
}
do_catchsql_test 10.1 {
  DELETE FROM z1;
} {1 {SQL logic error}}

expand_all_sql db
finish_test
