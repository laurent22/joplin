# 2004 Jun 27
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
# This file implements tests for miscellanous features that were
# left out of other test files.
#
# $Id: misc4.test,v 1.23 2007/12/08 18:01:31 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Prepare a statement that will create a temporary table.  Then do
# a rollback.  Then try to execute the prepared statement.
#
do_test misc4-1.1 {
  set DB [sqlite3_connection_pointer db]
  execsql {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
  }
} {}

ifcapable tempdb {
  do_test misc4-1.2 {
    set sql {CREATE TEMP TABLE t2 AS SELECT * FROM t1}
    set stmt [sqlite3_prepare $DB $sql -1 TAIL]
    execsql {
      BEGIN;
      CREATE TABLE t3(a,b,c);
      INSERT INTO t1 SELECT * FROM t1;
      ROLLBACK;
    }
  } {}

  # Because the previous transaction included a DDL statement and
  # was rolled back, statement $stmt was marked as expired. Executing it
  # now returns SQLITE_SCHEMA.
  do_test misc4-1.2.1 {
    list [sqlite3_step $stmt] [sqlite3_finalize $stmt]
  } {SQLITE_ERROR SQLITE_SCHEMA}
  do_test misc4-1.2.2 {
    set stmt [sqlite3_prepare $DB $sql -1 TAIL]
    set TAIL
  } {}

  do_test misc4-1.3 {
    sqlite3_step $stmt
  } SQLITE_DONE
  do_test misc4-1.4 {
    execsql {
      SELECT * FROM temp.t2;
    }
  } {1}
  
  # Drop the temporary table, then rerun the prepared  statement to
  # recreate it again.  This recreates ticket #807.
  #
  do_test misc4-1.5 {
    execsql {DROP TABLE t2}
    sqlite3_reset $stmt
    sqlite3_step $stmt
  } {SQLITE_ERROR}
  do_test misc4-1.6 {
    sqlite3_finalize $stmt
  } {SQLITE_SCHEMA}
}

# Prepare but do not execute various CREATE statements.  Then before
# those statements are executed, try to use the tables, indices, views,
# are triggers that were created.
#
do_test misc4-2.1 {
  set stmt [sqlite3_prepare $DB {CREATE TABLE t3(x);} -1 TAIL]
  catchsql {
    INSERT INTO t3 VALUES(1);
  }
} {1 {no such table: t3}}
do_test misc4-2.2 {
  sqlite3_step $stmt
} SQLITE_DONE
do_test misc4-2.3 {
  sqlite3_finalize $stmt
} SQLITE_OK
do_test misc4-2.4 {
  catchsql {
    INSERT INTO t3 VALUES(1);
  }
} {0 {}}

# Ticket #966
#
do_test misc4-3.1 {
  execsql { 
    CREATE TABLE Table1(ID integer primary key, Value TEXT);
    INSERT INTO Table1 VALUES(1, 'x');
    CREATE TABLE Table2(ID integer NOT NULL, Value TEXT);
    INSERT INTO Table2 VALUES(1, 'z');
    INSERT INTO Table2 VALUES (1, 'a');
  }
  catchsql { 
    SELECT ID, max(Value) FROM Table2 GROUP BY 1, 2 ORDER BY 1, 2;
  }
} {1 {aggregate functions are not allowed in the GROUP BY clause}}
ifcapable compound {
  do_test misc4-3.2 {
    execsql {
      SELECT ID, Value FROM Table1
         UNION SELECT ID, max(Value) FROM Table2 GROUP BY 1
      ORDER BY 1, 2;
    }
  } {1 x 1 z}
  do_test misc4-3.3 {
    catchsql { 
      SELECT ID, Value FROM Table1
         UNION SELECT ID, max(Value) FROM Table2 GROUP BY 1, 2
      ORDER BY 1, 2;
    }
  } {1 {aggregate functions are not allowed in the GROUP BY clause}}
  do_test misc4-3.4 {
    catchsql { 
      SELECT ID, max(Value) FROM Table2 GROUP BY 1, 2
         UNION SELECT ID, Value FROM Table1
      ORDER BY 1, 2;
    }
  } {1 {aggregate functions are not allowed in the GROUP BY clause}}
} ;# ifcapable compound

# Ticket #1047.  Make sure column types are preserved in subqueries.
#
ifcapable subquery {
  do_test misc4-4.1 {
    execsql {
      create table a(key varchar, data varchar);
      create table b(key varchar, period integer);
      insert into a values('01','data01');
      insert into a values('+1','data+1');
      
      insert into b values ('01',1);
      insert into b values ('01',2);
      insert into b values ('+1',3);
      insert into b values ('+1',4);
      
      select a.*, x.*
        from a, (select key,sum(period) from b group by key) as x
        where a.key=x.key order by 1 desc;
    }
  } {01 data01 01 3 +1 data+1 +1 7}

  # This test case tests the same property as misc4-4.1, but it is
  # a bit smaller which makes it easier to work with while debugging.
  do_test misc4-4.2 {
    execsql {
      CREATE TABLE ab(a TEXT, b TEXT);
      INSERT INTO ab VALUES('01', '1');
    }
    execsql {
      select * from ab, (select b from ab) as x where x.b = ab.a;
    }
  } {}
}


# Ticket #1036.  When creating tables from a SELECT on a view, use the
# short names of columns.
#
ifcapable view {
  do_test misc4-5.1 {
    execsql {
      create table t4(a,b);
      create table t5(a,c);
      insert into t4 values (1,2);
      insert into t5 values (1,3);
      create view myview as select t4.a a from t4 inner join t5 on t4.a=t5.a;
      create table problem as select * from myview; 
    }
    execsql2 {
      select * FROM problem;
    }
  } {a 1}
  do_test misc4-5.2 {
    execsql2 {
      create table t6 as select * from t4, t5;
      select * from t6;
    }
  } {a 1 b 2 a:1 1 c 3}
}

# Ticket #1086
do_test misc4-6.1 {
  execsql {
    CREATE TABLE abc(a);
    INSERT INTO abc VALUES(1);
    CREATE TABLE def(d, e, f, PRIMARY KEY(d, e));
  }
} {}
do_test misc4-6.2 {
  execsql {
    SELECT a FROM abc LEFT JOIN def ON (abc.a=def.d);
  }
} {1}

# 2015-05-15.  Error message formatting problem.
#
db close
sqlite3 db :memory:
sqlite3_db_config db DEFENSIVE 0
do_catchsql_test misc4-7.1 {
  CREATE TABLE t7(x);
  PRAGMA writable_schema=ON;
  UPDATE sqlite_master SET sql='CREATE TABLE [M%s%s%s%s%s%s%s%s%s%s%s%s%s';
  VACUUM;
} {1 {unrecognized token: "[M%s%s%s%s%s%s%s%s%s%s%s%s%s"}}

# 2015-05-18.  Use of ephermeral Mem content after the cursor that holds
# the canonical content has moved on.
#
do_execsql_test misc4-7.2 {
  CREATE TABLE t0(a,b);
  INSERT INTO t0 VALUES(1,0),(2,0);
  UPDATE t0 SET b=9 WHERE a AND (SELECT a FROM t0 WHERE a);
  SELECT * FROM t0 ORDER BY +a;
} {1 9 2 9}

finish_test
