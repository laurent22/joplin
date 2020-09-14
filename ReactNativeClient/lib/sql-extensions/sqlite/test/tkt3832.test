# 2009 April 30                                                            
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
# Ticket #3832
#
# A segfault when using a BEFORE trigger on an INSERT and inserting
# a NULL into the INTEGER PRIMARY KEY.
#
# $Id: tkt3832.test,v 1.1 2009/05/01 02:08:04 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}


do_test tkt3832-1.1 {
  db eval {
    CREATE TABLE t1(a INT, b INTEGER PRIMARY KEY);
    CREATE TABLE log(x);
    CREATE TRIGGER t1r1 BEFORE INSERT ON t1 BEGIN
      INSERT INTO log VALUES(new.b);
    END;
    INSERT INTO t1 VALUES(NULL,5);
    INSERT INTO t1 SELECT b, a FROM t1 ORDER BY b;
    SELECT rowid, * FROM t1;
    SELECT rowid, * FROM log;
  }
} {5 {} 5 6 5 6 1 5 2 -1}

finish_test
