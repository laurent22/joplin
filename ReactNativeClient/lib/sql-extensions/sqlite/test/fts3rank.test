# 2017 October 7
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts3rank

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

install_fts3_rank_function db
do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts3(a, b);
  INSERT INTO t1 VALUES('one two', 'one');
  INSERT INTO t1 VALUES('one two', 'three');
  INSERT INTO t1 VALUES('one two', 'two');
}

do_execsql_test 1.1 {
  SELECT * FROM t1 WHERE t1 MATCH 'one' 
  ORDER BY rank(matchinfo(t1), 1.0, 1.0) DESC, rowid
} {
  {one two} one
  {one two} three
  {one two} two
}

do_execsql_test 1.2 {
  SELECT * FROM t1 WHERE t1 MATCH 'two' 
  ORDER BY rank(matchinfo(t1), 1.0, 1.0) DESC, rowid
} {
  {one two} two
  {one two} one
  {one two} three
}

do_catchsql_test 1.3 {
  SELECT * FROM t1 ORDER BY rank(matchinfo(t1), 1.0, 1.0) DESC, rowid
} {1 {invalid matchinfo blob passed to function rank()}}

do_catchsql_test 1.4 {
  SELECT * FROM t1 ORDER BY rank(x'0000000000000000') DESC, rowid
} {0 {{one two} one {one two} three {one two} two}}

if {$tcl_platform(byteOrder)=="littleEndian"} {
  do_catchsql_test 1.5le {
    SELECT * FROM t1 ORDER BY rank(x'0100000001000000') DESC, rowid
  } {1 {invalid matchinfo blob passed to function rank()}}
} else {
  do_catchsql_test 1.5be {
    SELECT * FROM t1 ORDER BY rank(x'0000000100000001') DESC, rowid
  } {1 {invalid matchinfo blob passed to function rank()}}
}

finish_test
