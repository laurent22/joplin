
# 2013 August 29
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set ::testprefix tkt-9f2eb3abac

do_execsql_test 1.1 {
  CREATE TABLE t1(a,b,c,d,e, PRIMARY KEY(a,b,c,d,e));
  SELECT * FROM t1 WHERE a=? AND b=? AND c=? AND d=? AND e=?;
} {}

do_execsql_test 1.2 {
  CREATE TABLE "a" (
      "b" integer NOT NULL,
      "c" integer NOT NULL,
      PRIMARY KEY ("b", "c")
      );

  CREATE TABLE "d" (
      "e" integer NOT NULL,
      "g" integer NOT NULL,
      "f" integer NOT NULL,
      "h" integer NOT NULL,
      "i" character(10) NOT NULL,
      "j" int,
      PRIMARY KEY ("e", "g", "f", "h")
      );

  CREATE TABLE "d_to_a" (
      "f_e" integer NOT NULL,
      "f_g" integer NOT NULL,
      "f_f" integer NOT NULL,
      "f_h" integer NOT NULL,
      "t_b" integer NOT NULL,
      "t_c" integer NOT NULL,
      "r" character NOT NULL,
      "s" integer,
      PRIMARY KEY ("f_e", "f_g", "f_f", "f_h", "t_b", "t_c")
      );

  INSERT INTO d (g, e, h, f, j, i) VALUES ( 1, 1, 1, 1, 1, 1 );
  INSERT INTO a (b, c) VALUES ( 1, 1 );
  INSERT INTO d_to_a VALUES (1, 1, 1, 1, 1, 1, 1, 1);

  DELETE FROM d_to_a 
  WHERE f_g = 1 AND f_e = 1 AND f_h = 1 AND f_f = 1 AND t_b = 1 AND t_c = 1;

  SELECT * FROM d_to_a;
} {}

faultsim_delete_and_reopen
do_execsql_test 2.0 { CREATE TABLE t1(a,b,c,d,e, PRIMARY KEY(a,b,c,d,e)) }
do_execsql_test 2.1 { CREATE TABLE t2(x) }
faultsim_save_and_close

do_faultsim_test 3 -faults oom* -prep {
  faultsim_restore_and_reopen
  execsql { SELECT 1 FROM sqlite_master }
} -body {
  execsql { SELECT * FROM t1,t2 WHERE a=? AND b=? AND c=? AND d=? AND e=? }
} -test {
  faultsim_test_result {0 {}} 
}

finish_test
