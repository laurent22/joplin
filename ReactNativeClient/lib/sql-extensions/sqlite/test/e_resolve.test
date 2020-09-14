# 2010 November 30
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
# This file implements tests to verify that the "testable statements" in 
# the lang_naming.html document are correct.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix e_resolve

# An example database schema for testing name resolution:
#
set schema {
  ATTACH 'test.db2' AS at1;
  ATTACH 'test.db3' AS at2;

  CREATE TABLE   temp.n1(x, y); INSERT INTO temp.n1 VALUES('temp', 'n1');
  CREATE TRIGGER temp.n3 AFTER INSERT ON n1 BEGIN SELECT 1; END;
  CREATE INDEX   temp.n4 ON n1(x, y);

  CREATE TABLE   main.n1(x, y); INSERT INTO main.n1 VALUES('main', 'n1');
  CREATE TABLE   main.n2(x, y); INSERT INTO main.n2 VALUES('main', 'n2');
  CREATE INDEX   main.n3 ON n2(y, x);
  CREATE TRIGGER main.n4 BEFORE INSERT ON n2 BEGIN SELECT 1; END;

  CREATE TABLE   at1.n1(x, y);  INSERT INTO at1.n1 VALUES('at1', 'n1');
  CREATE TABLE   at1.n2(x, y);  INSERT INTO at1.n2 VALUES('at1', 'n2');
  CREATE TABLE   at1.n3(x, y);  INSERT INTO at1.n3 VALUES('at1', 'n3');

  CREATE TABLE   at2.n1(x, y);  INSERT INTO at2.n1 VALUES('at2', 'n1');
  CREATE TABLE   at2.n2(x, y);  INSERT INTO at2.n2 VALUES('at2', 'n2');
  CREATE TABLE   at2.n3(x, y);  INSERT INTO at2.n3 VALUES('at2', 'n3');
  CREATE TABLE   at2.n4(x, y);  INSERT INTO at2.n4 VALUES('at2', 'n4');
  CREATE TRIGGER at2.n4 BEFORE INSERT ON n4 BEGIN SELECT 1; END;
}

proc resolve_reopen_db {} {
  db close
  forcedelete test.db test.db2 test.db3
  sqlite3 db test.db
  db eval $::schema
}



# EVIDENCE-OF: R-33528-20612 If no database is specified as part of the
# object reference, then SQLite searches the main, temp and all attached
# databases for an object with a matching name. The temp database is
# searched first, followed by the main database, followed all attached
# databases in the order that they were attached. The reference resolves
# to the first match found.
#
resolve_reopen_db
do_execsql_test 1.1 { SELECT * FROM n1 } {temp n1}
do_execsql_test 1.2 { SELECT * FROM n2 } {main n2}
do_execsql_test 1.3 { SELECT * FROM n3 } {at1  n3}
do_execsql_test 1.4 { SELECT * FROM n4 } {at2  n4}

# EVIDENCE-OF: R-00634-08585 If a schema name is specified as part of an
# object reference, it must be either "main", or "temp" or the
# schema-name of an attached database.
#
#   Or else it is a "no such table: xxx" error.
#
resolve_reopen_db
do_execsql_test 2.1.1 { SELECT * FROM main.n1 } {main n1}
do_execsql_test 2.1.2 { SELECT * FROM temp.n1 } {temp n1}
do_execsql_test 2.1.3 { SELECT * FROM at1.n1 } {at1 n1}
do_execsql_test 2.1.4 { SELECT * FROM at2.n1 } {at2 n1}

do_catchsql_test 2.2 { SELECT * FROM xxx.n1 } {1 {no such table: xxx.n1}}

# EVIDENCE-OF: R-17446-42210 Like other SQL identifiers, schema names
# are case-insensitive.
#
resolve_reopen_db
do_execsql_test 3.1 { SELECT * FROM MAIN.n1 } {main n1}
do_execsql_test 3.2 { SELECT * FROM tEmP.n1 } {temp n1}
do_execsql_test 3.3 { SELECT * FROM aT1.n1 } {at1 n1}
do_execsql_test 3.4 { SELECT * FROM At2.n1 } {at2 n1}

# EVIDENCE-OF: R-14755-58619 If a schema name is specified, then only
# that one schema is searched for the named object.
#
do_catchsql_test 4.1 { SELECT * FROM temp.n2 } {1 {no such table: temp.n2}}
do_catchsql_test 4.2 { SELECT * FROM main.n2 } {0 {main n2}}
do_catchsql_test 4.3 { SELECT * FROM at1.n2 }  {0 {at1 n2}}
do_catchsql_test 4.4 { SELECT * FROM at2.n2 }  {0 {at2 n2}}

# EVIDENCE-OF: R-08951-19801 When searching database schemas for a named
# object, objects of types that cannot be used in the context of the
# reference are always ignored.
#
#   In this case, "types that cannot be used" are triggers and indexes.
#   The temp and main databases both contain triggers and indexes named
#   "n3" and "n4". Database "at2" contains a trigger called "n4". And yet:
#
do_execsql_test 5.1 { SELECT * FROM n3 } {at1  n3}
do_execsql_test 5.2 { SELECT * FROM n4 } {at2  n4}

#-------------------------------------------------------------------------
# EVIDENCE-OF: R-37286-42536 
#
db close
forcedelete test.db file.db
sqlite3 db test.db
do_execsql_test 6.1 {
  ATTACH 'file.db' AS aux;
  CREATE TABLE t1(x, y);
  CREATE TEMP TABLE t1(x, y);
  CREATE TABLE aux.t1(x, y);
}

do_execsql_test  6.2.0 { DROP TABLE t1 }
do_catchsql_test 6.2.1 { SELECT * FROM temp.t1 } {1 {no such table: temp.t1}}
do_catchsql_test 6.2.2 { SELECT * FROM main.t1 } {0 {}}
do_catchsql_test 6.2.3 { SELECT * FROM aux.t1  } {0 {}}

do_execsql_test  6.3.0 { DROP TABLE t1 }
do_catchsql_test 6.3.1 { SELECT * FROM main.t1 } {1 {no such table: main.t1}}
do_catchsql_test 6.3.3 { SELECT * FROM aux.t1  } {0 {}}

do_execsql_test  6.4.0 { DROP TABLE t1 }
do_catchsql_test 6.4.1 { SELECT * FROM aux.t1 } {1 {no such table: aux.t1}}

finish_test
