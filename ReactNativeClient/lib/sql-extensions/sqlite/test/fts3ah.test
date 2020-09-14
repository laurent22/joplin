# 2006 October 31 
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The focus
# here is testing correct handling of very long terms.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Generate a document of bigterms based on characters from the list
# chars.
proc bigtermdoc {chars len} {
  set doc ""
  foreach char $chars {
    append doc " " [string repeat $char $len]
  }
  return $doc
}

set len 5000
set doc1 [bigtermdoc {a b c d} $len]
set doc2 [bigtermdoc {b d e f} $len]
set doc3 [bigtermdoc {a c e} $len]

set aterm [string repeat a $len]
set bterm [string repeat b $len]
set xterm [string repeat x $len]

db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(content);
  INSERT INTO t1 (rowid, content) VALUES(1, $doc1);
  INSERT INTO t1 (rowid, content) VALUES(2, $doc2);
  INSERT INTO t1 (rowid, content) VALUES(3, $doc3);
}

# No hits at all.  Returns empty doclists from termSelect().
do_test fts3ah-1.1 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'something'}
} {}

do_test fts3ah-1.2 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH $aterm}
} {1 3}

do_test fts3ah-1.3 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH $xterm}
} {}

do_test fts3ah-1.4 {
  execsql "SELECT rowid FROM t1 WHERE t1 MATCH '$aterm -$xterm'"
} {1 3}

do_test fts3ah-1.5 {
  execsql "SELECT rowid FROM t1 WHERE t1 MATCH '\"$aterm $bterm\"'"
} {1}

finish_test
