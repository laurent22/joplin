# 2014-02-11
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
# it tests that ticket [4c86b126f22ad548fee0125337bdc9366912d9ac].
#
# When SQLite is compiled using SQLITE_ENABLE_STAT3 or SQLITE_ENABLE_STAT4,
# it gets the wrong answer...
#
# The problem was introduced in SQLite 3.8.1.

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test tkt-4c86b126f2-1.1 {
  CREATE TABLE nodes(
     local_relpath  TEXT PRIMARY KEY,
     moved_to  TEXT
  );
  INSERT INTO nodes VALUES('A',NULL);
  INSERT INTO nodes VALUES('A/B',NULL);
  INSERT INTO nodes VALUES('',NULL);
  INSERT INTO nodes VALUES('A/B/C-move',NULL);
  INSERT INTO nodes VALUES('A/B/C','A/B/C-move');
  INSERT INTO nodes VALUES('A/B-move',NULL);
  INSERT INTO nodes VALUES('A/B-move/C-move',NULL);
  INSERT INTO nodes VALUES('A/B-move/C','x');
  SELECT local_relpath, moved_to
   FROM nodes
  WHERE (local_relpath = 'A/B' OR
           ((local_relpath > 'A/B/') AND (local_relpath < 'A/B0')))
    AND moved_to IS NOT NULL;
} {A/B/C A/B/C-move}

do_execsql_test tkt-4c86b126f2-2.1 {
  CREATE TABLE t1(x TEXT UNIQUE, y TEXT UNIQUE, z);
  INSERT INTO t1 VALUES('ghi','jkl','y');
  SELECT * FROM t1 WHERE (x='ghi' OR y='jkl') AND z IS NOT NULL;
} {ghi jkl y}


finish_test
