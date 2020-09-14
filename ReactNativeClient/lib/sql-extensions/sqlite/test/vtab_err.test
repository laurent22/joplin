# 2006 June 10
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
# $Id: vtab_err.test,v 1.8 2007/09/03 16:12:10 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}


unset -nocomplain echo_module_begin_fail
do_ioerr_test vtab_err-1 -tclprep {
  register_echo_module [sqlite3_connection_pointer db]
} -sqlbody {
  BEGIN;
  CREATE TABLE r(a PRIMARY KEY, b, c);
  CREATE VIRTUAL TABLE e USING echo(r);
  INSERT INTO e VALUES(1, 2, 3);
  INSERT INTO e VALUES('a', 'b', 'c');
  UPDATE e SET c = 10;
  DELETE FROM e WHERE a = 'a';
  COMMIT;
  BEGIN;
    CREATE TABLE r2(a, b, c);
    INSERT INTO r2 SELECT * FROM e;
    INSERT INTO e SELECT a||'x', b, c FROM r2;
  COMMIT;
}

source $testdir/malloc_common.tcl


do_malloc_test vtab_err-2 -tclprep { 
  register_echo_module [sqlite3_connection_pointer db]
} -sqlbody {
  BEGIN;
  CREATE TABLE r(a PRIMARY KEY, b, c);
  CREATE VIRTUAL TABLE e USING echo(r);
  INSERT INTO e VALUES(1, 2, 3);
  INSERT INTO e VALUES('a', 'b', 'c');
  UPDATE e SET c = 10;
  DELETE FROM e WHERE a = 'a';
  COMMIT;
  BEGIN;
    CREATE TABLE r2(a, b, c);
    INSERT INTO r2 SELECT * FROM e;
    INSERT INTO e SELECT a||'x', b, c FROM r2;
  COMMIT;
} 

sqlite3_memdebug_fail -1

reset_db
register_echo_module [sqlite3_connection_pointer db]
do_execsql_test vtab_err-3.0 {
  CREATE TABLE r(a PRIMARY KEY, b, c);
  CREATE VIRTUAL TABLE e USING echo(r);
}
faultsim_save_and_close

do_faultsim_test vtab_err-3 -faults oom-t* -prep {
  faultsim_restore_and_reopen
  register_echo_module [sqlite3_connection_pointer db]
} -body {
  execsql {
    BEGIN;
      CREATE TABLE xyz(x);
      SELECT a FROM e;
    COMMIT;
  }
} -test {
  faultsim_test_result {0 {}}
}

finish_test
