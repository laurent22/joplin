# 2006 October 19
#
# The author disclaims copyright to this source code.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The focus
# of this script is testing handling of edge cases for various doclist
# merging functions in the FTS3 module query logic.
#
# $Id: fts3ag.test,v 1.2 2007/11/16 00:23:08 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(content);
  INSERT INTO t1 (rowid, content) VALUES(1, 'this is a test');
  INSERT INTO t1 (rowid, content) VALUES(2, 'also a test');
}

# No hits at all.  Returns empty doclists from termSelect().
do_test fts3ag-1.1 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'something'}
} {}

# Empty left in docListExceptMerge().
do_test fts3ag-1.2 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH '-this something'}
} {}

# Empty right in docListExceptMerge().
do_test fts3ag-1.3 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'this -something'}
} {1}

# Empty left in docListPhraseMerge().
do_test fts3ag-1.4 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH '"this something"'}
} {}

# Empty right in docListPhraseMerge().
do_test fts3ag-1.5 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH '"something is"'}
} {}

# Empty left in docListOrMerge().
do_test fts3ag-1.6 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'something OR this'}
} {1}

# Empty right in docListOrMerge().
do_test fts3ag-1.7 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'this OR something'}
} {1}

# Empty left in docListAndMerge().
do_test fts3ag-1.8 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'something this'}
} {}

# Empty right in docListAndMerge().
do_test fts3ag-1.9 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'this something'}
} {}

# No support for all-except queries.
do_test fts3ag-1.10 {
  catchsql {SELECT rowid FROM t1 WHERE t1 MATCH '-this -something'}
} {1 {malformed MATCH expression: [-this -something]}}

# Test that docListOrMerge() correctly handles reaching the end of one
# doclist before it reaches the end of the other.
do_test fts3ag-1.11 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'this OR also'}
} {1 2}
do_test fts3ag-1.12 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'also OR this'}
} {1 2}

# Empty left and right in docListOrMerge().  Each term matches neither
# row, and when combined there was an assertion failure.
do_test fts3ag-1.13 {
  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'something OR nothing'}
} {}

finish_test
