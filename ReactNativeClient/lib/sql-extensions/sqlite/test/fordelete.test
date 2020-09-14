# 2001 September 15
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
# focus of this file is testing the SELECT statement.
#
# $Id: select1.test,v 1.70 2009/05/28 01:00:56 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix fordelete

# This function returns a list of the tables or indexes opened with 
# OP_OpenWrite instructions when the SQL statement passed as the only 
# argument is executed. If the OPFLAG_FORDELETE flag is specified on
# the OP_OpenWrite, an asterix is appended to the object name. The list 
# is sorted in [lsort] order before it is returned.
#
proc analyze_delete_program {sql} {
  # Build a map from root page to table/index name.
  db eval {
    SELECT name, rootpage FROM sqlite_master
  } {
    set T($rootpage) $name
  }
  
  # For each OpenWrite instruction generated for the proposed DELETE
  # statement, add the following array entries:
  #
  #   $M(<cursor number>) -> <object name>
  #   $O(<object name>)   -> "*" | ""
  #
  # The O() entry is set to "*" if the BTREE_FORDELETE flag is specified,
  # or "" otherwise.
  #
  db eval "EXPLAIN $sql" R {
    if {$R(opcode)=="OpenWrite"} {
      set root $R(p2)
      set csr $R(p1)
      if {[info exists T($root)]} { set M($csr) $T($root) }

      set obj $T($root)
      set O($obj) ""
      if {$R(p5) & 0x08} { 
        set O($obj) *
      } else {
        set O($obj) ""
      }
    }
  }

  db eval "EXPLAIN $sql" R {
    if {$R(opcode) == "Delete"} {
      set csr $R(p1)
      if {[info exists M($csr)]} {
        set idxdelete [expr {("0x$R(p5)" & 0x04) ? 1 : 0}]
        if {$idxdelete} {
          append O($M($csr)) "+"
        }
      }
    }
  }

  set res [list]
  foreach {k v} [array get O] {
    lappend res "${k}${v}"
  }

  lsort $res
}

proc do_adp_test {tn sql res} {
  uplevel [list do_test $tn [list analyze_delete_program $sql] [list {*}$res]]
}

do_execsql_test 1.0 {
  CREATE TABLE t1(a PRIMARY KEY, b);
}

foreach {tn sql res} {
  1 { DELETE FROM t1 WHERE a=?}          { sqlite_autoindex_t1_1  t1*+ }
  2 { DELETE FROM t1 WHERE a=? AND b=? } { sqlite_autoindex_t1_1  t1+  }
  3 { DELETE FROM t1 WHERE a>? }         { sqlite_autoindex_t1_1  t1*+ }
  4 { DELETE FROM t1 WHERE rowid=? }     { sqlite_autoindex_t1_1*  t1  }
} {
  do_adp_test 1.$tn $sql $res
}

do_execsql_test 2.0 {
  CREATE TABLE t2(a, b, c);
  CREATE INDEX t2a ON t2(a);
  CREATE INDEX t2b ON t2(b);
  CREATE INDEX t2c ON t2(c);
}
foreach {tn sql res} {
  1 { DELETE FROM t2 WHERE a=?}          { t2*+ t2a t2b* t2c* }
  2 { DELETE FROM t2 WHERE a=? AND +b=?} { t2+ t2a t2b* t2c* }
  3 { DELETE FROM t2 WHERE a=? OR b=?}   { t2 t2a* t2b* t2c* }
  4 { DELETE FROM t2 WHERE +a=? }        { t2 t2a* t2b* t2c* }
  5 { DELETE FROM t2 WHERE rowid=? }     { t2 t2a* t2b* t2c* }
} {
  do_adp_test 2.$tn $sql $res
}

#-------------------------------------------------------------------------
# Test that a record that consists of the bytes:
#
#   0x01 0x00
#
# is interpreted by OP_Column as a vector of NULL values (assuming the 
# default column values are NULL). Also test that:
#
#   0x00
#
# is handled in the same way.
#
do_execsql_test 3.0 {
  CREATE TABLE x1(a INTEGER PRIMARY KEY, b, c, d);
  CREATE TABLE x2(a INTEGER PRIMARY KEY, b, c, d);
}

do_test 3.1 {
  set root [db one { SELECT rootpage FROM sqlite_master WHERE name = 'x1' }]
  db eval { 
    BEGIN IMMEDIATE;
  }
  set bt [btree_from_db db]
  set csr [btree_cursor $bt $root 1]
  btree_insert $csr 5 "\000"
  btree_close_cursor $csr
  db eval { COMMIT }

  db eval {
    SELECT * FROM x1;
  }
} {5 {} {} {}}

do_test 3.2 {
  set root [db one { SELECT rootpage FROM sqlite_master WHERE name = 'x2' }]
  db eval { 
    BEGIN IMMEDIATE;
  }
  set bt [btree_from_db db]
  set csr [btree_cursor $bt $root 1]
  btree_insert $csr 6 "\000"
  btree_close_cursor $csr
  db eval { COMMIT }

  db eval {
    SELECT * FROM x2;
  }
} {6 {} {} {}}


#-------------------------------------------------------------------------
#
reset_db 
do_execsql_test 4.0 {
  CREATE TABLE log(x);
  CREATE TABLE p1(one PRIMARY KEY, two);

  CREATE TRIGGER tr_bd BEFORE DELETE ON p1 BEGIN
    INSERT INTO log VALUES('delete');
  END;
  INSERT INTO p1 VALUES('a', 'A'), ('b', 'B'), ('c', 'C');
  DELETE FROM p1 WHERE one = 'a';
}

reset_db
do_execsql_test 4.1 {
  BEGIN TRANSACTION;
  CREATE TABLE tbl(a PRIMARY KEY, b, c);
  CREATE TABLE log(a, b, c);
  INSERT INTO "tbl" VALUES(1,2,3);
  CREATE TRIGGER the_trigger BEFORE DELETE ON tbl BEGIN 
    INSERT INTO log VALUES(1, 2,3);
  END;
  COMMIT;
  DELETE FROM tbl WHERE a=1;
}

reset_db
do_execsql_test 5.1 {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  CREATE TABLE t2(
      c INTEGER PRIMARY KEY,
      d INTEGER DEFAULT 1 REFERENCES t1 ON DELETE SET DEFAULT
  );
} {}
do_execsql_test 5.2 {
  INSERT INTO t1 VALUES(1, 'one');
  INSERT INTO t1 VALUES(2, 'two');
  INSERT INTO t2 VALUES(1, 2);
  SELECT * FROM t2;
} {1 2}
do_execsql_test 5.3 {
  DELETE FROM t1 WHERE a = 2;
} {}


finish_test
