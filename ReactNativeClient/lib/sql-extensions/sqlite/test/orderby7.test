# 2014-04-25
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
# focus of this file is testing ORDER BY optimizations on joins
# that involve virtual tables.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix orderby7

ifcapable !fts3 {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE fts USING fts3(content TEXT);
  INSERT INTO fts(rowid,content)
     VALUES(1,'this is a test of the fts3 virtual'),
           (2,'table used as part of a join together'),
           (3,'with the DISTINCT keyword.  There was'),
           (4,'a bug at one time (2013-06 through 2014-04)'),
           (5,'that prevented this from working correctly.'),
           (11,'a row that occurs twice'),
           (12,'a row that occurs twice');
 
  CREATE TABLE t1(x TEXT PRIMARY KEY, y);
  INSERT OR IGNORE INTO t1 SELECT content, rowid+100 FROM fts;
} {}
do_execsql_test 1.1 {
  SELECT DISTINCT fts.rowid, t1.y
    FROM fts, t1
   WHERE fts MATCH 'that twice'
     AND content=x
   ORDER BY y;
} {11 111 12 111}
do_execsql_test 1.2 {
  SELECT DISTINCT fts.rowid, t1.x
    FROM fts, t1
   WHERE fts MATCH 'that twice'
     AND content=x
   ORDER BY 1;
} {11 {a row that occurs twice} 12 {a row that occurs twice}}
do_execsql_test 1.3 {
  SELECT DISTINCT t1.x
    FROM fts, t1
   WHERE fts MATCH 'that twice'
     AND content=x
   ORDER BY 1;
} {{a row that occurs twice}}
do_execsql_test 1.4 {
  SELECT t1.x
    FROM fts, t1
   WHERE fts MATCH 'that twice'
     AND content=x
   ORDER BY 1;
} {{a row that occurs twice} {a row that occurs twice}}
do_execsql_test 1.5 {
  SELECT DISTINCT t1.x
    FROM fts, t1
   WHERE fts MATCH 'that twice'
     AND content=x;
} {{a row that occurs twice}}
do_execsql_test 1.6 {
  SELECT t1.x
    FROM fts, t1
   WHERE fts MATCH 'that twice'
     AND content=x;
} {{a row that occurs twice} {a row that occurs twice}}

do_execsql_test 2.1 {
  SELECT DISTINCT t1.x
    FROM fts, t1
   WHERE fts.rowid=11
     AND content=x
   ORDER BY fts.rowid;
} {{a row that occurs twice}}
do_execsql_test 2.2 {
  SELECT DISTINCT t1.*
    FROM fts, t1
   WHERE fts.rowid=11
     AND content=x
   ORDER BY fts.rowid;
} {{a row that occurs twice} 111}
do_execsql_test 2.3 {
  SELECT DISTINCT t1.*
    FROM fts, t1
   WHERE fts.rowid=11
     AND content=x
   ORDER BY t1.y
} {{a row that occurs twice} 111}




finish_test
