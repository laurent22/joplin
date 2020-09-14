# 2013-11-02
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
# focus of this file is testing WITHOUT ROWID tables, and especially
# FOREIGN KEY constraints.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!foreignkey} {
  finish_test
  return
}

# Create a table and some data to work with.
#
do_test without_rowid2-1.0 {
  execsql {
    CREATE TABLE t1(
      a INT PRIMARY KEY,
      b INT
           REFERENCES t1 ON DELETE CASCADE
           REFERENCES t2,
      c TEXT,
      FOREIGN KEY (b,c) REFERENCES t2(x,y) ON UPDATE CASCADE
    ) WITHOUT rowid;
  }
} {}
do_test without_rowid2-1.1 {
  execsql {
    CREATE TABLE t2(
      x INT PRIMARY KEY,
      y TEXT
    ) WITHOUT rowid;
  }
} {}
do_test without_rowid2-1.2 {
  execsql {
    CREATE TABLE t3(
      a INT REFERENCES t2,
      b INT REFERENCES t1,
      FOREIGN KEY (a,b) REFERENCES t2(x,y)
    );
  }
} {}

do_test without_rowid2-2.1 {
  execsql {
    CREATE TABLE t4(a int primary key) WITHOUT rowid;
    CREATE TABLE t5(x references t4);
    CREATE TABLE t6(x references t4);
    CREATE TABLE t7(x references t4);
    CREATE TABLE t8(x references t4);
    CREATE TABLE t9(x references t4);
    CREATE TABLE t10(x references t4);
    DROP TABLE t7;
    DROP TABLE t9;
    DROP TABLE t5;
    DROP TABLE t8;
    DROP TABLE t6;
    DROP TABLE t10;
  }
} {}

do_test without_rowid2-3.1 {
  execsql {
    CREATE TABLE t5(a PRIMARY KEY, b, c) WITHOUT rowid;
    CREATE TABLE t6(
      d REFERENCES t5,
      e REFERENCES t5(c)
    );
    PRAGMA foreign_key_list(t6);
  }
} [concat                                         \
  {0 0 t5 e c {NO ACTION} {NO ACTION} NONE}       \
  {1 0 t5 d {} {NO ACTION} {NO ACTION} NONE}      \
]
do_test without_rowid2-3.2 {
  execsql {
    CREATE TABLE t7(d, e, f,
      FOREIGN KEY (d, e) REFERENCES t5(a, b)
    );
    PRAGMA foreign_key_list(t7);
  }
} [concat                                   \
  {0 0 t5 d a {NO ACTION} {NO ACTION} NONE} \
  {0 1 t5 e b {NO ACTION} {NO ACTION} NONE} \
]
do_test without_rowid2-3.3 {
  execsql {
    CREATE TABLE t8(d, e, f,
      FOREIGN KEY (d, e) REFERENCES t5 ON DELETE CASCADE ON UPDATE SET NULL
    );
    PRAGMA foreign_key_list(t8);
  }
} [concat                        \
  {0 0 t5 d {} {SET NULL} CASCADE NONE} \
  {0 1 t5 e {} {SET NULL} CASCADE NONE} \
]
do_test without_rowid2-3.4 {
  execsql {
    CREATE TABLE t9(d, e, f,
      FOREIGN KEY (d, e) REFERENCES t5 ON DELETE CASCADE ON UPDATE SET DEFAULT
    );
    PRAGMA foreign_key_list(t9);
  }
} [concat                        \
  {0 0 t5 d {} {SET DEFAULT} CASCADE NONE} \
  {0 1 t5 e {} {SET DEFAULT} CASCADE NONE} \
]
do_test without_rowid2-3.5 {
  sqlite3_db_status db DBSTATUS_DEFERRED_FKS 0
} {0 0 0}

finish_test
