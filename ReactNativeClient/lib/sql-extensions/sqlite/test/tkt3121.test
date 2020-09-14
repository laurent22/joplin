# 2008 May 16
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
# $Id: tkt3121.test,v 1.2 2008/07/12 14:52:21 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

# Register the module
register_echo_module [sqlite3_connection_pointer db]

do_test vtabD-1.1 {
  execsql {
    PRAGMA encoding = 'utf16';

    CREATE TABLE r1(field);
    CREATE TABLE r2(col PRIMARY KEY, descr);

    INSERT INTO r1 VALUES('abcd');
    INSERT INTO r2 VALUES('abcd', 'A nice description');
    INSERT INTO r2 VALUES('efgh', 'Another description');

    CREATE VIRTUAL TABLE t1 USING echo(r1);
    CREATE VIRTUAL TABLE t2 USING echo(r2);
  }
} {}

do_test vtabD-1.2 {
  execsql {
    select
      t1.field as Field,
      t2.descr as Descr
    from t1 inner join t2 on t1.field = t2.col order by t1.field
  }
} {abcd {A nice description}}

finish_test
