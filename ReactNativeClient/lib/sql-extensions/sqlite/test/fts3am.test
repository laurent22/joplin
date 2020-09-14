# 2007 April 9
#
# The author disclaims copyright to this source code.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  fts3
# DELETE handling assumed all fields were non-null.  This was not
# the intention at all.
#
# $Id: fts3am.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(col_a, col_b);

  INSERT INTO t1(rowid, col_a, col_b) VALUES(1, 'testing', 'testing');
  INSERT INTO t1(rowid, col_a, col_b) VALUES(2, 'only a', null);
  INSERT INTO t1(rowid, col_a, col_b) VALUES(3, null, 'only b');
  INSERT INTO t1(rowid, col_a, col_b) VALUES(4, null, null);
}

do_test fts3am-1.0 {
  execsql {
    SELECT COUNT(col_a), COUNT(col_b), COUNT(*) FROM t1;
  }
} {2 2 4}

do_test fts3am-1.1 {
  execsql {
    DELETE FROM t1 WHERE rowid = 1;
    SELECT COUNT(col_a), COUNT(col_b), COUNT(*) FROM t1;
  }
} {1 1 3}

do_test fts3am-1.2 {
  execsql {
    DELETE FROM t1 WHERE rowid = 2;
    SELECT COUNT(col_a), COUNT(col_b), COUNT(*) FROM t1;
  }
} {0 1 2}

do_test fts3am-1.3 {
  execsql {
    DELETE FROM t1 WHERE rowid = 3;
    SELECT COUNT(col_a), COUNT(col_b), COUNT(*) FROM t1;
  }
} {0 0 1}

do_test fts3am-1.4 {
  execsql {
    DELETE FROM t1 WHERE rowid = 4;
    SELECT COUNT(col_a), COUNT(col_b), COUNT(*) FROM t1;
  }
} {0 0 0}

finish_test
