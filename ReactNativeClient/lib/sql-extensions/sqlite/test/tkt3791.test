# 2009 April 2
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Ticket #3791:  A segfault when inserting into a table that contains
# an arbitrary expression as its default value.
#
# $Id: tkt3791.test,v 1.1 2009/04/08 12:21:31 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3791-1.1 {
  db eval {
    CREATE TABLE t1(x, y DEFAULT(datetime('now')));
    INSERT INTO t1(x) VALUES(1);
    SELECT x, length(y) FROM t1;
  }
} {1 19}

finish_test
