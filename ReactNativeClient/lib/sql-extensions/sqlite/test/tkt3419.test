# 2008 October 06
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
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the fix for ticket #3419.
# Ticket #3419 is really a duplication of #3408 and had already
# been fixed by the time it was reported.  But it never hurts to
# add new test cases.
#
# $Id: tkt3419.test,v 1.1 2008/10/06 15:31:13 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3419-1.1 {
  execsql {
    create table a(id integer primary key);
    create table b(id integer primary key, a_id integer);
    create table c(id integer primary key, b_id integer);
  
    insert into a values (1);
    insert into a values (2);
  
    insert into b values (3, 1);
    insert into b values (4, 1);
    insert into b values (5, 1);
    insert into b values (6, 1);
    insert into b values (9, 2);
  
    insert into c values (4, 3);
    insert into c values (5, 5);
    insert into c values (6, 4);
    insert into c values (7, 6);
    insert into c values (8, 9);
  
    select * FROM a, b, c WHERE a.id=2 AND b.a_id = a.id AND b.id=c.b_id;
  }
} {2 9 2 8 9}
do_test tkt3419-1.2 {
  execsql {
    select * FROM a, c, b WHERE a.id=2 AND b.a_id = a.id AND b.id=c.b_id;
  }
} {2 8 9 9 2}
do_test tkt3419-1.3 {
  execsql {
    select * FROM b, a, c WHERE a.id=2 AND b.a_id = a.id AND b.id=c.b_id;
  }
} {9 2 2 8 9}
do_test tkt3419-1.4 {
  execsql {
    select * FROM b, c, a WHERE a.id=2 AND b.a_id = a.id AND b.id=c.b_id;
  }
} {9 2 8 9 2}
do_test tkt3419-1.5 {
  execsql {
    select * FROM c, a, b WHERE a.id=2 AND b.a_id = a.id AND b.id=c.b_id;
  }
} {8 9 2 9 2}
do_test tkt3419-1.6 {
  execsql {
    select * FROM c, b, a WHERE a.id=2 AND b.a_id = a.id AND b.id=c.b_id;
  }
} {8 9 9 2 2}

finish_test
