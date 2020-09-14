# 2011 October 13
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file implements regression tests for the FTS SQLite module.
#
# This file implements tests to verify that ticket [9fd058691] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

set ::testprefix fts3-9fd058691

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE fts USING fts3( tags TEXT);
  INSERT INTO fts (tags) VALUES ('tag1');
  SELECT * FROM fts WHERE tags MATCH 'tag1';
} {tag1}

do_test 1.1 {
  db close
  sqlite3 db test.db
  execsql {
    UPDATE fts SET tags = 'tag1' WHERE rowid = 1;
    SELECT * FROM fts WHERE tags MATCH 'tag1';
  }
} {tag1}

db close
forcedelete test.db
sqlite3 db test.db

do_execsql_test 2.0 {
  CREATE VIRTUAL TABLE fts USING fts3(tags TEXT);
  INSERT INTO fts (docid, tags) VALUES (1, 'tag1');
  INSERT INTO fts (docid, tags) VALUES (2, NULL);
  INSERT INTO fts (docid, tags) VALUES (3, 'three');
} {}

do_test 2.1 {
  execsql {
    UPDATE fts SET tags = 'two' WHERE rowid = 2;
    SELECT * FROM fts WHERE tags MATCH 'two';
  }
} {two}

finish_test
