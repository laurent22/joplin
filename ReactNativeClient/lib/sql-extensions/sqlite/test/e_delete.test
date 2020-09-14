# 2010 September 21
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
# the lang_delete.html document are correct.
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

proc do_delete_tests {args} {
  uplevel do_select_tests $args
}

do_execsql_test e_delete-0.0 {
  CREATE TABLE t1(a, b);
  CREATE INDEX i1 ON t1(a);
} {}

# -- syntax diagram delete-stmt
# -- syntax diagram qualified-table-name
#
do_delete_tests e_delete-0.1 {
  1  "DELETE FROM t1"                              {}
  2  "DELETE FROM t1 INDEXED BY i1"                {}
  3  "DELETE FROM t1 NOT INDEXED"                  {}
  4  "DELETE FROM main.t1"                         {}
  5  "DELETE FROM main.t1 INDEXED BY i1"           {}
  6  "DELETE FROM main.t1 NOT INDEXED"             {}
  7  "DELETE FROM t1 WHERE a>2"                    {}
  8  "DELETE FROM t1 INDEXED BY i1 WHERE a>2"      {}
  9  "DELETE FROM t1 NOT INDEXED WHERE a>2"        {}
  10 "DELETE FROM main.t1 WHERE a>2"               {}
  11 "DELETE FROM main.t1 INDEXED BY i1 WHERE a>2" {}
  12 "DELETE FROM main.t1 NOT INDEXED WHERE a>2"   {}
}

# EVIDENCE-OF: R-20205-17349 If the WHERE clause is not present, all
# records in the table are deleted.
#
drop_all_tables
do_test e_delete-1.0 {
  db transaction {
    foreach t {t1 t2 t3 t4 t5 t6} {
      execsql [string map [list %T% $t] {
        CREATE TABLE %T%(x, y);
        INSERT INTO %T% VALUES(1, 'one');
        INSERT INTO %T% VALUES(2, 'two');
        INSERT INTO %T% VALUES(3, 'three');
        INSERT INTO %T% VALUES(4, 'four');
        INSERT INTO %T% VALUES(5, 'five');
      }]
    }
  }
} {}
do_delete_tests e_delete-1.1 {
  1  "DELETE FROM t1       ; SELECT * FROM t1"       {}
  2  "DELETE FROM main.t2  ; SELECT * FROM t2"       {}
}

# EVIDENCE-OF: R-26300-50198 If a WHERE clause is supplied, then only
# those rows for which the WHERE clause boolean expression is true are
# deleted.
#
# EVIDENCE-OF: R-23360-48280 Rows for which the expression is false or
# NULL are retained.
#
do_delete_tests e_delete-1.2 {
  1  "DELETE FROM t3 WHERE 1       ; SELECT x FROM t3"       {}
  2  "DELETE FROM main.t4 WHERE 0  ; SELECT x FROM t4"       {1 2 3 4 5}
  3  "DELETE FROM t4 WHERE 0.0     ; SELECT x FROM t4"       {1 2 3 4 5}
  4  "DELETE FROM t4 WHERE NULL    ; SELECT x FROM t4"       {1 2 3 4 5}
  5  "DELETE FROM t4 WHERE y!='two'; SELECT x FROM t4"       {2}
  6  "DELETE FROM t4 WHERE y='two' ; SELECT x FROM t4"       {}
  7  "DELETE FROM t5 WHERE x=(SELECT max(x) FROM t5);SELECT x FROM t5" {1 2 3 4}
  8  "DELETE FROM t5 WHERE (SELECT max(x) FROM t4)  ;SELECT x FROM t5" {1 2 3 4}
  9  "DELETE FROM t5 WHERE (SELECT max(x) FROM t6)  ;SELECT x FROM t5" {}
  10 "DELETE FROM t6 WHERE y>'seven' ; SELECT y FROM t6"     {one four five}
}


#-------------------------------------------------------------------------
# Tests for restrictions on DELETE statements that appear within trigger
# programs.
#
forcedelete test.db2
forcedelete test.db3
do_execsql_test e_delete-2.0 {
  ATTACH 'test.db2' AS aux;
  ATTACH 'test.db3' AS aux2;

  CREATE TABLE temp.t7(a, b);   INSERT INTO temp.t7 VALUES(1, 2);
  CREATE TABLE main.t7(a, b);   INSERT INTO main.t7 VALUES(3, 4);
  CREATE TABLE aux.t7(a, b);    INSERT INTO aux.t7 VALUES(5, 6);
  CREATE TABLE aux2.t7(a, b);   INSERT INTO aux2.t7 VALUES(7, 8);

  CREATE TABLE main.t8(a, b);   INSERT INTO main.t8 VALUES(1, 2);
  CREATE TABLE aux.t8(a, b);    INSERT INTO aux.t8 VALUES(3, 4);
  CREATE TABLE aux2.t8(a, b);   INSERT INTO aux2.t8 VALUES(5, 6);

  CREATE TABLE aux.t9(a, b);    INSERT INTO aux.t9 VALUES(1, 2);
  CREATE TABLE aux2.t9(a, b);   INSERT INTO aux2.t9 VALUES(3, 4);

  CREATE TABLE aux2.t10(a, b);  INSERT INTO aux2.t10 VALUES(1, 2);
} {}


# EVIDENCE-OF: R-09681-58560 The table-name specified as part of a
# DELETE statement within a trigger body must be unqualified.
#
# EVIDENCE-OF: R-12275-20298 In other words, the schema-name. prefix on
# the table name is not allowed within triggers.
#
do_delete_tests e_delete-2.1 -error {
  qualified table names are not allowed on INSERT, UPDATE, and DELETE statements within triggers
} {
  1 {
      CREATE TRIGGER tr1 AFTER INSERT ON t1 BEGIN
        DELETE FROM main.t2;
      END;
  } {}

  2 {
      CREATE TRIGGER tr1 BEFORE UPDATE ON t2 BEGIN
        DELETE FROM temp.t7 WHERE a=new.a;
      END;
  } {}

  3 {
      CREATE TRIGGER tr1 AFTER UPDATE ON t8 BEGIN
        DELETE FROM aux2.t8 WHERE b!=a;
      END;
  } {}
}

# EVIDENCE-OF: R-28818-63526 If the table to which the trigger is
# attached is not in the temp database, then DELETE statements within
# the trigger body must operate on tables within the same database as
# it.
# 
#   This is tested in two parts. First, check that if a table of the
#   specified name does not exist, an error is raised. Secondly, test
#   that if tables with the specified name exist in multiple databases,
#   the local database table is used.
#
do_delete_tests e_delete-2.2.1 -error { no such table: %s } {
  1 {
      CREATE TRIGGER main.tr1 AFTER INSERT ON main.t7 BEGIN
        DELETE FROM t9;
      END;
      INSERT INTO main.t7 VALUES(1, 2);
  } {main.t9}

  2 {
      CREATE TRIGGER aux.tr2 BEFORE UPDATE ON t9 BEGIN
        DELETE FROM t10;
      END;
      UPDATE t9 SET a=1;
  } {aux.t10}
}
do_execsql_test e_delete-2.2.X {
  DROP TRIGGER main.tr1;
  DROP TRIGGER aux.tr2;
} {}

do_delete_tests e_delete-2.2.2 {
  1 {
      CREATE TRIGGER aux.tr1 AFTER INSERT ON t8 BEGIN
        DELETE FROM t9;
      END;
      INSERT INTO aux.t8 VALUES(1, 2);

      SELECT count(*) FROM aux.t9 
        UNION ALL
      SELECT count(*) FROM aux2.t9;
  } {0 1}

  2 {
      CREATE TRIGGER main.tr1 AFTER INSERT ON t8 BEGIN
        DELETE FROM t7;
      END;
      INSERT INTO main.t8 VALUES(1, 2);

      SELECT count(*) FROM temp.t7 
        UNION ALL
      SELECT count(*) FROM main.t7
        UNION ALL
      SELECT count(*) FROM aux.t7
        UNION ALL
      SELECT count(*) FROM aux2.t7;
  } {1 0 1 1}
}

# EVIDENCE-OF: R-31567-38587 If the table to which the trigger is
# attached is in the TEMP database, then the unqualified name of the
# table being deleted is resolved in the same way as it is for a
# top-level statement (by searching first the TEMP database, then the
# main database, then any other databases in the order they were
# attached).
#
do_execsql_test e_delete-2.3.0 {
  DROP TRIGGER aux.tr1;
  DROP TRIGGER main.tr1;
  DELETE FROM main.t8 WHERE oid>1;
  DELETE FROM aux.t8 WHERE oid>1;
  INSERT INTO aux.t9 VALUES(1, 2);
  INSERT INTO main.t7 VALUES(3, 4);
} {}
do_execsql_test e_delete-2.3.1 {
  SELECT count(*) FROM temp.t7 UNION ALL SELECT count(*) FROM main.t7 UNION ALL
  SELECT count(*) FROM aux.t7  UNION ALL SELECT count(*) FROM aux2.t7;

  SELECT count(*) FROM main.t8 UNION ALL SELECT count(*) FROM aux.t8  
  UNION ALL SELECT count(*) FROM aux2.t8;

  SELECT count(*) FROM aux.t9  UNION ALL SELECT count(*) FROM aux2.t9;

  SELECT count(*) FROM aux2.t10;
} {1 1 1 1 1 1 1 1 1 1}
do_execsql_test e_delete-2.3.2 {
  CREATE TRIGGER temp.tr1 AFTER INSERT ON t7 BEGIN
    DELETE FROM t7;
    DELETE FROM t8;
    DELETE FROM t9;
    DELETE FROM t10;
  END;
  INSERT INTO temp.t7 VALUES('hello', 'world');
} {}
do_execsql_test e_delete-2.3.3 {
  SELECT count(*) FROM temp.t7 UNION ALL SELECT count(*) FROM main.t7 UNION ALL
  SELECT count(*) FROM aux.t7  UNION ALL SELECT count(*) FROM aux2.t7;

  SELECT count(*) FROM main.t8 UNION ALL SELECT count(*) FROM aux.t8  
  UNION ALL SELECT count(*) FROM aux2.t8;

  SELECT count(*) FROM aux.t9  UNION ALL SELECT count(*) FROM aux2.t9;

  SELECT count(*) FROM aux2.t10;
} {0 1 1 1 0 1 1 0 1 0}

# EVIDENCE-OF: R-28691-49464 The INDEXED BY and NOT INDEXED clauses are
# not allowed on DELETE statements within triggers.
#
do_execsql_test e_delete-2.4.0 {
  CREATE INDEX i8 ON t8(a, b);
} {}
do_delete_tests e_delete-2.4 -error {
  the %s %s clause is not allowed on UPDATE or DELETE statements within triggers
} {
  1 {
    CREATE TRIGGER tr3 AFTER INSERT ON t8 BEGIN
      DELETE FROM t8 INDEXED BY i8 WHERE a=5;
    END;
  } {INDEXED BY}
  2 {
    CREATE TRIGGER tr3 AFTER INSERT ON t8 BEGIN
      DELETE FROM t8 NOT INDEXED WHERE a=5;
    END;
  } {NOT INDEXED}
}

ifcapable update_delete_limit {

# EVIDENCE-OF: R-64942-06615 The LIMIT and ORDER BY clauses (described
# below) are unsupported for DELETE statements within triggers.
#
do_delete_tests e_delete-2.5 -error { near "%s": syntax error } {
  1 {
    CREATE TRIGGER tr3 AFTER INSERT ON t8 BEGIN
      DELETE FROM t8 LIMIT 10;
    END;
  } {LIMIT}
  2 {
    CREATE TRIGGER tr3 AFTER INSERT ON t8 BEGIN
      DELETE FROM t8 ORDER BY a LIMIT 5;
    END;
  } {ORDER}
}

# EVIDENCE-OF: R-40026-10531 If SQLite is compiled with the
# SQLITE_ENABLE_UPDATE_DELETE_LIMIT compile-time option, then the syntax
# of the DELETE statement is extended by the addition of optional ORDER
# BY and LIMIT clauses:
#
# -- syntax diagram delete-stmt-limited
#
do_delete_tests e_delete-3.1 {
  1   "DELETE FROM t1 LIMIT 5"                                    {}
  2   "DELETE FROM t1 LIMIT 5-1 OFFSET 2+2"                       {}
  3   "DELETE FROM t1 LIMIT 2+2, 16/4"                            {}
  4   "DELETE FROM t1 ORDER BY x LIMIT 5"                         {}
  5   "DELETE FROM t1 ORDER BY x LIMIT 5-1 OFFSET 2+2"            {}
  6   "DELETE FROM t1 ORDER BY x LIMIT 2+2, 16/4"                 {}
  7   "DELETE FROM t1 WHERE x>2 LIMIT 5"                          {}
  8   "DELETE FROM t1 WHERE x>2 LIMIT 5-1 OFFSET 2+2"             {}
  9   "DELETE FROM t1 WHERE x>2 LIMIT 2+2, 16/4"                  {}
  10  "DELETE FROM t1 WHERE x>2 ORDER BY x LIMIT 5"               {}
  11  "DELETE FROM t1 WHERE x>2 ORDER BY x LIMIT 5-1 OFFSET 2+2"  {}
  12  "DELETE FROM t1 WHERE x>2 ORDER BY x LIMIT 2+2, 16/4"       {}
}

drop_all_tables
proc rebuild_t1 {} {
  catchsql { DROP TABLE t1 }
  execsql {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 'one');
    INSERT INTO t1 VALUES(2, 'two');
    INSERT INTO t1 VALUES(3, 'three');
    INSERT INTO t1 VALUES(4, 'four');
    INSERT INTO t1 VALUES(5, 'five');
  }
}

# EVIDENCE-OF: R-44062-08550 If a DELETE statement has a LIMIT clause,
# the maximum number of rows that will be deleted is found by evaluating
# the accompanying expression and casting it to an integer value.
#
rebuild_t1
do_delete_tests e_delete-3.2 -repair rebuild_t1 -query {
  SELECT a FROM t1
} {
  1   "DELETE FROM t1 LIMIT 3"       {4 5}
  2   "DELETE FROM t1 LIMIT 1+1"     {3 4 5}
  3   "DELETE FROM t1 LIMIT '4'"     {5}
  4   "DELETE FROM t1 LIMIT '1.0'"   {2 3 4 5}
}

# EVIDENCE-OF: R-02661-56399 If the result of the evaluating the LIMIT
# clause cannot be losslessly converted to an integer value, it is an
# error.
#
do_delete_tests e_delete-3.3 -error { datatype mismatch } {
  1   "DELETE FROM t1 LIMIT 'abc'"   {}
  2   "DELETE FROM t1 LIMIT NULL"    {}
  3   "DELETE FROM t1 LIMIT X'ABCD'" {}
  4   "DELETE FROM t1 LIMIT 1.2"     {}
}

# EVIDENCE-OF: R-00598-03741 A negative LIMIT value is interpreted as
# "no limit".
#
do_delete_tests e_delete-3.4 -repair rebuild_t1 -query {
  SELECT a FROM t1
} {
  1   "DELETE FROM t1 LIMIT -1"       {}
  2   "DELETE FROM t1 LIMIT 2-4"      {}
  3   "DELETE FROM t1 LIMIT -4.0"     {}
  4   "DELETE FROM t1 LIMIT 5*-1"     {}
}

# EVIDENCE-OF: R-26377-49195 If the DELETE statement also has an OFFSET
# clause, then it is similarly evaluated and cast to an integer value.
# Again, it is an error if the value cannot be losslessly converted to
# an integer.
#
do_delete_tests e_delete-3.5 -error { datatype mismatch } {
  1   "DELETE FROM t1 LIMIT 1 OFFSET 'abc'"   {}
  2   "DELETE FROM t1 LIMIT 1 OFFSET NULL"    {}
  3   "DELETE FROM t1 LIMIT 1 OFFSET X'ABCD'" {}
  4   "DELETE FROM t1 LIMIT 1 OFFSET 1.2"     {}
  5   "DELETE FROM t1 LIMIT 'abc', 1"         {}
  6   "DELETE FROM t1 LIMIT NULL, 1"          {}
  7   "DELETE FROM t1 LIMIT X'ABCD', 1"       {}
  8   "DELETE FROM t1 LIMIT 1.2, 1"           {}
}


# EVIDENCE-OF: R-64004-53814 If there is no OFFSET clause, or the
# calculated integer value is negative, the effective OFFSET value is
# zero.
#
do_delete_tests e_delete-3.6 -repair rebuild_t1 -query {
  SELECT a FROM t1
} {
  1a  "DELETE FROM t1 LIMIT 3 OFFSET 0"        {4 5}
  1b  "DELETE FROM t1 LIMIT 3"                 {4 5}
  1c  "DELETE FROM t1 LIMIT 3 OFFSET -1"       {4 5}
  2a  "DELETE FROM t1 LIMIT 1+1 OFFSET 0"      {3 4 5}
  2b  "DELETE FROM t1 LIMIT 1+1"               {3 4 5}
  2c  "DELETE FROM t1 LIMIT 1+1 OFFSET 2-5"    {3 4 5}
  3a  "DELETE FROM t1 LIMIT '4' OFFSET 0"      {5}
  3b  "DELETE FROM t1 LIMIT '4'"               {5}
  3c  "DELETE FROM t1 LIMIT '4' OFFSET -1.0"   {5}
  4a  "DELETE FROM t1 LIMIT '1.0' OFFSET 0"    {2 3 4 5}
  4b  "DELETE FROM t1 LIMIT '1.0'"             {2 3 4 5}
  4c  "DELETE FROM t1 LIMIT '1.0' OFFSET -11"  {2 3 4 5}
}

# EVIDENCE-OF: R-48141-52334 If the DELETE statement has an ORDER BY
# clause, then all rows that would be deleted in the absence of the
# LIMIT clause are sorted according to the ORDER BY. The first M rows,
# where M is the value found by evaluating the OFFSET clause expression,
# are skipped, and the following N, where N is the value of the LIMIT
# expression, are deleted.
#
do_delete_tests e_delete-3.7 -repair rebuild_t1 -query {
  SELECT a FROM t1
} {
  1   "DELETE FROM t1 ORDER BY b LIMIT 2"               {1 2 3}
  2   "DELETE FROM t1 ORDER BY length(b), a LIMIT 3"    {3 5}
  3   "DELETE FROM t1 ORDER BY a DESC LIMIT 1 OFFSET 0"  {1 2 3 4}
  4   "DELETE FROM t1 ORDER BY a DESC LIMIT 1 OFFSET 1"  {1 2 3 5}
  5   "DELETE FROM t1 ORDER BY a DESC LIMIT 1 OFFSET 2"  {1 2 4 5}
}

# EVIDENCE-OF: R-64535-08414 If there are less than N rows remaining
# after taking the OFFSET clause into account, or if the LIMIT clause
# evaluated to a negative value, then all remaining rows are deleted.
#
do_delete_tests e_delete-3.8 -repair rebuild_t1 -query {
  SELECT a FROM t1
} {
  1   "DELETE FROM t1 ORDER BY a ASC LIMIT 10"           {}
  2   "DELETE FROM t1 ORDER BY a ASC LIMIT -1"           {}
  3   "DELETE FROM t1 ORDER BY a ASC LIMIT 4 OFFSET 2"   {1 2}
}

# EVIDENCE-OF: R-37284-06965 If the DELETE statement has no ORDER BY
# clause, then all rows that would be deleted in the absence of the
# LIMIT clause are assembled in an arbitrary order before applying the
# LIMIT and OFFSET clauses to determine the subset that are actually
# deleted.
#
#     In practice, the "arbitrary order" is rowid order.
#
do_delete_tests e_delete-3.9 -repair rebuild_t1 -query {
  SELECT a FROM t1
} {
  1   "DELETE FROM t1 LIMIT 2"               {3 4 5}
  2   "DELETE FROM t1 LIMIT 3"               {4 5}
  3   "DELETE FROM t1 LIMIT 1 OFFSET 0"      {2 3 4 5}
  4   "DELETE FROM t1 LIMIT 1 OFFSET 1"      {1 3 4 5}
  5   "DELETE FROM t1 LIMIT 1 OFFSET 2"      {1 2 4 5}
}


# EVIDENCE-OF: R-07548-13422 The ORDER BY clause on a DELETE statement
# is used only to determine which rows fall within the LIMIT. The order
# in which rows are deleted is arbitrary and is not influenced by the
# ORDER BY clause.
#
#     In practice, rows are always deleted in rowid order.
#
do_delete_tests e_delete-3.10 -repair {
  rebuild_t1 
  catchsql { DROP TABLE t1log }
  execsql {
    CREATE TABLE t1log(x);
    CREATE TRIGGER tr1 AFTER DELETE ON t1 BEGIN
      INSERT INTO t1log VALUES(old.a);
    END;
  }
} -query {
  SELECT x FROM t1log
} {
  1   "DELETE FROM t1 ORDER BY a DESC LIMIT 2"   {4 5}
  2   "DELETE FROM t1 ORDER BY a DESC LIMIT -1"  {1 2 3 4 5}
  3   "DELETE FROM t1 ORDER BY a ASC LIMIT 2"    {1 2}
  4   "DELETE FROM t1 ORDER BY a ASC LIMIT -1"   {1 2 3 4 5}
}

}
 
finish_test
