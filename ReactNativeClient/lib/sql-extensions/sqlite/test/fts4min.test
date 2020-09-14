# 2020 February 27
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set ::testprefix fts4min

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

#------------------------------------------------------------------
do_execsql_test 0.0 {
  CREATE TABLE t1(a NOT NULL, b);
  CREATE INDEX i1 ON t1(a);
}

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE ft USING fts3(c);
  INSERT INTO ft(docid, c) VALUES(22, 'hello world');
  INSERT INTO ft(docid, c) VALUES(44, 'hello world');
  INSERT INTO ft(docid, c) VALUES(11, 'hello world');
}

do_eqp_test 1.1.1 {
  SELECT max(rowid) FROM ft
} {VIRTUAL TABLE INDEX 0:DESC}

do_eqp_test 1.1.2 {
  SELECT min(rowid) FROM ft
} {VIRTUAL TABLE INDEX 0:ASC}

do_execsql_test 1.2.1 {
  SELECT max(rowid) FROM ft
} {44}

do_execsql_test 1.2.2 {
  SELECT min(rowid) FROM ft
} {11}

finish_test
