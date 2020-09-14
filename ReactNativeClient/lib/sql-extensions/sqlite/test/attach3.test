# 2003 July 1
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
# focus of this script is testing the ATTACH and DETACH commands
# and schema changes to attached databases.
#
# $Id: attach3.test,v 1.18 2007/10/09 08:29:32 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !attach {
  finish_test
  return
}

# The tests in this file were written before SQLite supported recursive
# trigger invocation, and some tests depend on that to pass. So disable
# recursive triggers for this file.
catchsql { pragma recursive_triggers = off } 

# Create tables t1 and t2 in the main database
execsql {
  CREATE TABLE t1(a, b);
  CREATE TABLE t2(c, d);
}

# Create tables t1 and t2 in database file test2.db
forcedelete test2.db
forcedelete test2.db-journal
sqlite3 db2 test2.db
execsql {
  CREATE TABLE t1(a, b);
  CREATE TABLE t2(c, d);
} db2
db2 close

# Create a table in the auxilary database.
do_test attach3-1.1 {
  execsql {
    ATTACH 'test2.db' AS aux;
  }
} {}
do_test attach3-1.2 {
  execsql {
    CREATE TABLE aux.t3(e, f);
  }
} {}
do_test attach3-1.3 {
  execsql {
    SELECT * FROM sqlite_master WHERE name = 't3';
  }
} {}
do_test attach3-1.4 {
  execsql {
    SELECT * FROM aux.sqlite_master WHERE name = 't3';
  }
} "table t3 t3 [expr $AUTOVACUUM?5:4] {CREATE TABLE t3(e, f)}"
do_test attach3-1.5 {
  execsql {
    INSERT INTO t3 VALUES(1, 2);
    SELECT * FROM t3;
  }
} {1 2}

# Create an index on the auxilary database table.
do_test attach3-2.1 {
  execsql {
    CREATE INDEX aux.i1 on t3(e);
  }
} {}
do_test attach3-2.2 {
  execsql {
    SELECT * FROM sqlite_master WHERE name = 'i1';
  }
} {}
do_test attach3-2.3 {
  execsql {
    SELECT * FROM aux.sqlite_master WHERE name = 'i1';
  }
} "index i1 t3 [expr $AUTOVACUUM?6:5] {CREATE INDEX i1 on t3(e)}"

# Drop the index on the aux database table.
do_test attach3-3.1 {
  execsql {
    DROP INDEX aux.i1;
    SELECT * FROM aux.sqlite_master WHERE name = 'i1';
  }
} {}
do_test attach3-3.2 {
  execsql {
    CREATE INDEX aux.i1 on t3(e);
    SELECT * FROM aux.sqlite_master WHERE name = 'i1';
  }
} "index i1 t3 [expr $AUTOVACUUM?6:5] {CREATE INDEX i1 on t3(e)}"
do_test attach3-3.3 {
  execsql {
    DROP INDEX i1;
    SELECT * FROM aux.sqlite_master WHERE name = 'i1';
  }
} {}

# Drop tables t1 and t2 in the auxilary database.
do_test attach3-4.1 {
  execsql {
    DROP TABLE aux.t1;
    SELECT name FROM aux.sqlite_master;
  }
} {t2 t3}
do_test attach3-4.2 {
  # This will drop main.t2
  execsql {
    DROP TABLE t2;
    SELECT name FROM aux.sqlite_master;
  }
} {t2 t3}
do_test attach3-4.3 {
  execsql {
    DROP TABLE t2;
    SELECT name FROM aux.sqlite_master;
  }
} {t3}

# Create a view in the auxilary database.
ifcapable view {
do_test attach3-5.1 {
  execsql {
    CREATE VIEW aux.v1 AS SELECT * FROM t3;
  }
} {}
do_test attach3-5.2 {
  execsql {
    SELECT * FROM aux.sqlite_master WHERE name = 'v1';
  }
} {view v1 v1 0 {CREATE VIEW v1 AS SELECT * FROM t3}}
do_test attach3-5.3 {
  execsql {
    INSERT INTO aux.t3 VALUES('hello', 'world');
    SELECT * FROM v1;
  }
} {1 2 hello world}

# Drop the view 
do_test attach3-6.1 {
  execsql {
    DROP VIEW aux.v1;
  }
} {}
do_test attach3-6.2 {
  execsql {
    SELECT * FROM aux.sqlite_master WHERE name = 'v1';
  }
} {}
} ;# ifcapable view

ifcapable {trigger} {
# Create a trigger in the auxilary database.
do_test attach3-7.1 {
  execsql {
    CREATE TRIGGER aux.tr1 AFTER INSERT ON t3 BEGIN
      INSERT INTO t3 VALUES(new.e*2, new.f*2);
    END;
  }
} {}
do_test attach3-7.2 {
  execsql {
    DELETE FROM t3;
    INSERT INTO t3 VALUES(10, 20);
    SELECT * FROM t3;
  }
} {10 20 20 40}
do_test attach3-5.3 {
  execsql {
    SELECT * FROM aux.sqlite_master WHERE name = 'tr1';
  }
} {trigger tr1 t3 0 {CREATE TRIGGER tr1 AFTER INSERT ON t3 BEGIN
      INSERT INTO t3 VALUES(new.e*2, new.f*2);
    END}}

# Drop the trigger 
do_test attach3-8.1 {
  execsql {
    DROP TRIGGER aux.tr1;
  }
} {}
do_test attach3-8.2 {
  execsql {
    SELECT * FROM aux.sqlite_master WHERE name = 'tr1';
  }
} {}

ifcapable tempdb {
  # Try to trick SQLite into dropping the wrong temp trigger.
  do_test attach3-9.0 {
    execsql {
      CREATE TABLE main.t4(a, b, c);
      CREATE TABLE aux.t4(a, b, c);
      CREATE TEMP TRIGGER tst_trigger BEFORE INSERT ON aux.t4 BEGIN 
        SELECT 'hello world';
      END;
      SELECT count(*) FROM temp.sqlite_master;
    }
  } {1}
  do_test attach3-9.1 {
    execsql {
      DROP TABLE main.t4;
      SELECT count(*) FROM sqlite_temp_master;
    }
  } {1}
  do_test attach3-9.2 {
    execsql {
      DROP TABLE aux.t4;
      SELECT count(*) FROM temp.sqlite_master;
    }
  } {0}
}
} ;# endif trigger

# Make sure the aux.sqlite_master table is read-only
do_test attach3-10.0 {
  catchsql {
    INSERT INTO aux.sqlite_master VALUES(1, 2, 3, 4, 5);
  }
} {1 {table sqlite_master may not be modified}}

# Failure to attach leaves us in a workable state.
# Ticket #811
#
do_test attach3-11.0 {
  catchsql {
    ATTACH DATABASE '/nodir/nofile.x' AS notadb;
  }
} {1 {unable to open database: /nodir/nofile.x}}
do_test attach3-11.1 {
  catchsql {
    ATTACH DATABASE ':memory:' AS notadb;
  }
} {0 {}}
do_test attach3-11.2 {
  catchsql {
    DETACH DATABASE notadb;
  }
} {0 {}}

# Return a list of attached databases
#
proc db_list {} {
  set x [execsql {
    PRAGMA database_list;
  }]
  set y {}
  foreach {n id file} $x {lappend y $id}
  return $y
}

ifcapable schema_pragmas&&tempdb {

ifcapable !trigger {
  execsql {create temp table dummy(dummy)}
}

# Ticket #1825
#
do_test attach3-12.1 {
  db_list
} {main temp aux}
do_test attach3-12.2 {
  execsql {
    ATTACH DATABASE ? AS ?
  }
  db_list
} {main temp aux {}}
do_test attach3-12.3 {
  execsql {
    DETACH aux
  }
  db_list
} {main temp {}}
do_test attach3-12.4 {
  execsql {
    DETACH ?
  }
  db_list
} {main temp}
do_test attach3-12.5 {
  execsql {
    ATTACH DATABASE '' AS ''
  }
  db_list
} {main temp {}}
do_test attach3-12.6 {
  execsql {
    DETACH ''
  }
  db_list
} {main temp}
do_test attach3-12.7 {
  execsql {
    ATTACH DATABASE '' AS ?
  }
  db_list
} {main temp {}}
do_test attach3-12.8 {
  execsql {
    DETACH ''
  }
  db_list
} {main temp}
do_test attach3-12.9 {
  execsql {
    ATTACH DATABASE '' AS NULL
  }
  db_list
} {main temp {}}
do_test attach3-12.10 {
  execsql {
    DETACH ?
  }
  db_list
} {main temp}
do_test attach3-12.11 {
  catchsql {
    DETACH NULL
  }
} {1 {no such database: }}
do_test attach3-12.12 {
  catchsql {
    ATTACH null AS null;
    ATTACH '' AS '';
  }
} {1 {database  is already in use}}
do_test attach3-12.13 {
  db_list
} {main temp {}}
do_test attach3-12.14 {
  execsql {
    DETACH '';
  }
  db_list
} {main temp}

} ;# ifcapable pragma

finish_test
