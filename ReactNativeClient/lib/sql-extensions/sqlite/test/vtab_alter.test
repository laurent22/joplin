# 2007 June 26
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the ALTER TABLE ... RENAME TO
# command on virtual tables.
#
# $Id: vtab_alter.test,v 1.3 2007/12/13 21:54:11 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab||!altertable {
  finish_test
  return
}

# Register the echo module.
#
# This test uses a special feature of the echo module. If the name
# of the virtual table is a prefix of the name of the underlying
# real table (for example if the v-table is "tbl" and the real table
# is "tbl_base"), then the name of the real table is modified
# when an "ALTER TABLE ... RENAME TO" is executed on the v-table.
# For example:
#
#   sqlite> CREATE TABLE t1_base(a, b, c); 
#   sqlite> CREATE VIRTUAL TABLE t1 USING(t1_base);
#   sqlite> ALTER TABLE t1 RENAME TO t2;
#   sqlite> SELECT tbl_name FROM sqlite_master;
#   t2_base
#   t2
#
register_echo_module [sqlite3_connection_pointer db]


# Try to rename an echo table. Make sure nothing terrible happens.
#
do_test vtab_alter-1.1 {
  execsql { CREATE TABLE t1(a, b VARCHAR, c INTEGER) }
} {}
do_test vtab_alter-1.2 {
  execsql { CREATE VIRTUAL TABLE t1echo USING echo(t1) }
} {}
do_test vtab_alter-1.3 {
  catchsql { SELECT * FROM t1echo }
} {0 {}}
do_test vtab_alter-1.4 {
  execsql { ALTER TABLE t1echo RENAME TO new }
} {}
do_test vtab_alter-1.5 {
  catchsql { SELECT * FROM t1echo }
} {1 {no such table: t1echo}}
do_test vtab_alter-1.6 {
  catchsql { SELECT * FROM new }
} {0 {}}

# Try to rename an echo table that renames its base table. Make 
# sure nothing terrible happens.
#
do_test vtab_alter-2.1 {
  execsql { 
    DROP TABLE new;
    DROP TABLE t1;
    CREATE TABLE t1_base(a, b, c);
    CREATE VIRTUAL TABLE t1 USING echo('*_base');
  }
} {}
do_test vtab_alter-2.2 {
  execsql { 
    INSERT INTO t1_base VALUES(1, 2, 3);
    SELECT * FROM t1;
  }
} {1 2 3}
do_test vtab_alter-2.3 {
  execsql { ALTER TABLE t1 RENAME TO x }
} {}
do_test vtab_alter-2.4 {
  execsql { SELECT * FROM x; }
} {1 2 3}
do_test vtab_alter-2.5 {
  execsql { SELECT * FROM x_base; }
} {1 2 3}

# Cause an error to occur when the echo module renames its
# backing store table.
#
do_test vtab_alter-3.1 {
  execsql  { CREATE TABLE y_base(a, b, c) }
  catchsql { ALTER TABLE x RENAME TO y }
} {1 {SQL logic error}}
do_test vtab_alter-3.2 {
  execsql  { SELECT * FROM x }
} {1 2 3}

finish_test
