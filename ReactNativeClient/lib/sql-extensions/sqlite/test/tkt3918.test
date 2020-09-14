# 2009 June 17
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
# $Id: tkt3918.test,v 1.1 2009/06/17 11:13:28 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3918.1 {
  execsql {
    PRAGMA page_size = 1024;
    PRAGMA auto_vacuum = incremental;
    CREATE TABLE t1(i, x);
  }
} {}
do_test tkt3918.2 {
  execsql {
    INSERT INTO t1 VALUES(1, randstr(1000,1000));
    INSERT INTO t1 VALUES(2, zeroblob(248*1020 + 100));
    INSERT INTO t1 VALUES(3, zeroblob(2*1020 + 100));
  }
} {}

# This set of statements sets up the free list so that the
# first free-list trunk page contains only a single leaf.
# The leaf page is also the last page in the database. The
# second free-list trunk page contains, amongst other things,
# page number 4.
do_test tkt3918.3 {
  execsql {
    DELETE FROM t1 WHERE i = 2;
    DELETE FROM t1 WHERE i = 1;
    DELETE FROM t1 WHERE i = 3;
  }
} {}

# Incrementally vacuum the database to reduce its size by a single
# page. This will remove the single leaf from the first page in
# the linked list of free-list trunk pages.
do_test tkt3918.4 {
  execsql { PRAGMA incremental_vacuum = 1 }
} {}

# Create another table. This operation will attempt to extract 
# page 4 from the database free-list. Bug 3918 caused sqlite to
# incorrectly report corruption here.
do_test tkt3918.5 {
  execsql { CREATE TABLE t2(a, b) }
} {}

finish_test
