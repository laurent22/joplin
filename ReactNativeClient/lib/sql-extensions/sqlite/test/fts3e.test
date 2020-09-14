# 2008 July 29
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# These tests exercise the various types of fts3 cursors.
#
# $Id: fts3e.test,v 1.1 2008/07/29 20:24:46 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

#*************************************************************************
# Test table scan (QUERY_GENERIC).  This kind of query happens for
# queries with no WHERE clause, or for WHERE clauses which cannot be
# satisfied by an index.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
}

do_test fts3e-1.1 {
  execsql {
    SELECT docid FROM t1 ORDER BY docid;
  }
} {1 2 3}

do_test fts3e-1.2 {
  execsql {
    SELECT docid FROM t1 WHERE c LIKE '%test' ORDER BY docid;
  }
} {1 2 3}

do_test fts3e-1.3 {
  execsql {
    SELECT docid FROM t1 WHERE c LIKE 'That%' ORDER BY docid;
  }
} {2}

#*************************************************************************
# Test lookup by docid (QUERY_DOCID).  This kind of query happens for
# queries which select by the docid/rowid implicit index.
db eval {
  DROP TABLE IF EXISTS t1;
  DROP TABLE IF EXISTS t2;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  CREATE TABLE t2(id INTEGER PRIMARY KEY AUTOINCREMENT, weight INTEGER UNIQUE);
  INSERT INTO t2 VALUES (null, 10);
  INSERT INTO t1 (docid, c) VALUES (last_insert_rowid(), 'This is a test');
  INSERT INTO t2 VALUES (null, 5);
  INSERT INTO t1 (docid, c) VALUES (last_insert_rowid(), 'That was a test');
  INSERT INTO t2 VALUES (null, 20);
  INSERT INTO t1 (docid, c) VALUES (last_insert_rowid(), 'This is a test');
}

# TODO(shess): This actually is doing QUERY_GENERIC?  I'd have
# expected QUERY_DOCID in this case, as for a very large table the
# full scan is less efficient.
do_test fts3e-2.1 {
  execsql {
    SELECT docid FROM t1 WHERE docid in (1, 2, 10);
    SELECT rowid FROM t1 WHERE rowid in (1, 2, 10);
  }
} {1 2 1 2}

do_test fts3e-2.2 {
  execsql {
    SELECT docid, weight FROM t1, t2 WHERE t2.id = t1.docid ORDER BY weight;
    SELECT t1.rowid, weight FROM t1, t2 WHERE t2.id = t1.rowid ORDER BY weight;
  }
} {2 5 1 10 3 20 2 5 1 10 3 20}

do_test fts3e-2.3 {
  execsql {
    SELECT docid, weight FROM t1, t2
           WHERE t2.weight>5 AND t2.id = t1.docid ORDER BY weight;
    SELECT t1.rowid, weight FROM t1, t2
           WHERE t2.weight>5 AND t2.id = t1.rowid ORDER BY weight;
  }
} {1 10 3 20 1 10 3 20}

#*************************************************************************
# Test lookup by MATCH (QUERY_FULLTEXT).  This is the fulltext index.
db eval {
  DROP TABLE IF EXISTS t1;
  DROP TABLE IF EXISTS t2;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  CREATE TABLE t2(id INTEGER PRIMARY KEY AUTOINCREMENT, weight INTEGER UNIQUE);
  INSERT INTO t2 VALUES (null, 10);
  INSERT INTO t1 (docid, c) VALUES (last_insert_rowid(), 'This is a test');
  INSERT INTO t2 VALUES (null, 5);
  INSERT INTO t1 (docid, c) VALUES (last_insert_rowid(), 'That was a test');
  INSERT INTO t2 VALUES (null, 20);
  INSERT INTO t1 (docid, c) VALUES (last_insert_rowid(), 'This is a test');
}

do_test fts3e-3.1 {
  execsql {
    SELECT docid FROM t1 WHERE t1 MATCH 'this' ORDER BY docid;
  }
} {1 3}

do_test fts3e-3.2 {
  execsql {
    SELECT docid, weight FROM t1, t2
     WHERE t1 MATCH 'this' AND t1.docid = t2.id ORDER BY weight;
  }
} {1 10 3 20}

finish_test
