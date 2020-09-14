# 2012 December 17
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
# This file tests the PRAGMA foreign_key_check command.
#
# EVIDENCE-OF: R-15402-03103 PRAGMA schema.foreign_key_check; PRAGMA
# schema.foreign_key_check(table-name);
#
# EVIDENCE-OF: R-41653-15278 The foreign_key_check pragma checks the
# database, or the table called "table-name", for foreign key
# constraints that are violated. The foreign_key_check pragma returns
# one row output for each foreign key violation.

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fkey5

ifcapable {!foreignkey} {
  finish_test
  return
}

do_test fkey5-1.1 {
  db eval {
    CREATE TABLE p1(a INTEGER PRIMARY KEY); INSERT INTO p1 VALUES(88),(89);
    CREATE TABLE p2(a INT PRIMARY KEY); INSERT INTO p2 VALUES(77),(78);
    CREATE TABLE p3(a TEXT PRIMARY KEY);
    INSERT INTO p3 VALUES(66),(67),('alpha'),('BRAVO');
    CREATE TABLE p4(a TEXT PRIMARY KEY COLLATE nocase);
    INSERT INTO p4 VALUES('alpha'),('BRAVO'),('55'),('Delta'),('ECHO');
    CREATE TABLE p5(a INTEGER PRIMARY KEY, b, c, UNIQUE(b,c));
    INSERT INTO p5 VALUES(1,'Alpha','abc'),(2,'beta','def');
    CREATE TABLE p6(a INTEGER PRIMARY KEY, b TEXT COLLATE nocase,
                    c TEXT COLLATE rtrim, UNIQUE(b,c));
    INSERT INTO p6 VALUES(1,'Alpha','abc '),(2,'bETA','def    ');

    CREATE TABLE c1(x INTEGER PRIMARY KEY references p1);
    CREATE TABLE c2(x INTEGER PRIMARY KEY references p2);
    CREATE TABLE c3(x INTEGER PRIMARY KEY references p3);
    CREATE TABLE c4(x INTEGER PRIMARY KEY references p4);
    CREATE TABLE c5(x INT references p1);
    CREATE TABLE c6(x INT references p2);
    CREATE TABLE c7(x INT references p3);
    CREATE TABLE c8(x INT references p4);
    CREATE TABLE c9(x TEXT UNIQUE references p1);
    CREATE TABLE c10(x TEXT UNIQUE references p2);
    CREATE TABLE c11(x TEXT UNIQUE references p3);
    CREATE TABLE c12(x TEXT UNIQUE references p4);
    CREATE TABLE c13(x TEXT COLLATE nocase references p3);
    CREATE TABLE c14(x TEXT COLLATE nocase references p4);
    CREATE TABLE c15(x, y, FOREIGN KEY(x,y) REFERENCES p5(b,c));
    CREATE TABLE c16(x, y, FOREIGN KEY(x,y) REFERENCES p5(c,b));
    CREATE TABLE c17(x, y, FOREIGN KEY(x,y) REFERENCES p6(b,c));
    CREATE TABLE c18(x, y, FOREIGN KEY(x,y) REFERENCES p6(c,b));
    CREATE TABLE c19(x TEXT COLLATE nocase, y TEXT COLLATE rtrim,
                     FOREIGN KEY(x,y) REFERENCES p5(b,c));
    CREATE TABLE c20(x TEXT COLLATE nocase, y TEXT COLLATE rtrim,
                     FOREIGN KEY(x,y) REFERENCES p5(c,b));
    CREATE TABLE c21(x TEXT COLLATE nocase, y TEXT COLLATE rtrim,
                     FOREIGN KEY(x,y) REFERENCES p6(b,c));
    CREATE TABLE c22(x TEXT COLLATE nocase, y TEXT COLLATE rtrim,
                     FOREIGN KEY(x,y) REFERENCES p6(c,b));

    PRAGMA foreign_key_check;
  }
} {}    
do_test fkey5-1.2 {
  db eval {
    INSERT INTO c1 VALUES(90),(87),(88);
    PRAGMA foreign_key_check;
  }
} {c1 87 p1 0 c1 90 p1 0}
do_test fkey5-1.2b {
  db eval {
    PRAGMA main.foreign_key_check;
  }
} {c1 87 p1 0 c1 90 p1 0}
do_test fkey5-1.2c {
  db eval {
    PRAGMA temp.foreign_key_check;
  }
} {}
do_test fkey5-1.3 {
  db eval {
    PRAGMA foreign_key_check(c1);
  }
} {c1 87 p1 0 c1 90 p1 0}
do_test fkey5-1.4 {
  db eval {
    PRAGMA foreign_key_check(c2);
  }
} {}
do_test fkey5-1.5 {
  db eval {
    PRAGMA main.foreign_key_check(c2);
  }
} {}
do_test fkey5-1.6 {
  catchsql {
    PRAGMA temp.foreign_key_check(c2);
  }
} {1 {no such table: temp.c2}}

# EVIDENCE-OF: R-45728-08709 There are four columns in each result row.
#
# EVIDENCE-OF: R-55672-01620 The first column is the name of the table
# that contains the REFERENCES clause.
#
# EVIDENCE-OF: R-00471-55166 The second column is the rowid of the row
# that contains the invalid REFERENCES clause, or NULL if the child
# table is a WITHOUT ROWID table.
#
# The second clause in the previous is tested by fkey5-10.3.
#
# EVIDENCE-OF: R-40482-20265 The third column is the name of the table
# that is referred to.
#
# EVIDENCE-OF: R-62839-07969 The fourth column is the index of the
# specific foreign key constraint that failed.
#
do_test fkey5-2.0 {
  db eval {
    INSERT INTO c5 SELECT x FROM c1;
    DELETE FROM c1;
    PRAGMA foreign_key_check;
  }
} {c5 1 p1 0 c5 3 p1 0}
do_test fkey5-2.1 {
  db eval {
    PRAGMA foreign_key_check(c5);
  }
} {c5 1 p1 0 c5 3 p1 0}
do_test fkey5-2.2 {
  db eval {
    PRAGMA foreign_key_check(c1);
  }
} {}
do_execsql_test fkey5-2.3 {
  PRAGMA foreign_key_list(c5);
} {0 0 p1 x {} {NO ACTION} {NO ACTION} NONE}

do_test fkey5-3.0 {
  db eval {
    INSERT INTO c9 SELECT x FROM c5;
    DELETE FROM c5;
    PRAGMA foreign_key_check;
  }
} {c9 1 p1 0 c9 3 p1 0}
do_test fkey5-3.1 {
  db eval {
    PRAGMA foreign_key_check(c9);
  }
} {c9 1 p1 0 c9 3 p1 0}
do_test fkey5-3.2 {
  db eval {
    PRAGMA foreign_key_check(c5);
  }
} {}

do_test fkey5-4.0 {
  db eval {
    DELETE FROM c9;
    INSERT INTO c2 VALUES(79),(77),(76);
    PRAGMA foreign_key_check;
  }
} {c2 76 p2 0 c2 79 p2 0}
do_test fkey5-4.1 {
  db eval {
    PRAGMA foreign_key_check(c2);
  }
} {c2 76 p2 0 c2 79 p2 0}
do_test fkey5-4.2 {
  db eval {
    INSERT INTO c6 SELECT x FROM c2;
    DELETE FROM c2;
    PRAGMA foreign_key_check;
  }
} {c6 1 p2 0 c6 3 p2 0}
do_test fkey5-4.3 {
  db eval {
    PRAGMA foreign_key_check(c6);
  }
} {c6 1 p2 0 c6 3 p2 0}
do_test fkey5-4.4 {
  db eval {
    INSERT INTO c10 SELECT x FROM c6;
    DELETE FROM c6;
    PRAGMA foreign_key_check;
  }
} {c10 1 p2 0 c10 3 p2 0}
do_test fkey5-4.5 {
  db eval {
    PRAGMA foreign_key_check(c10);
  }
} {c10 1 p2 0 c10 3 p2 0}

do_test fkey5-5.0 {
  db eval {
    DELETE FROM c10;
    INSERT INTO c3 VALUES(68),(67),(65);
    PRAGMA foreign_key_check;
  }
} {c3 65 p3 0 c3 68 p3 0}
do_test fkey5-5.1 {
  db eval {
    PRAGMA foreign_key_check(c3);
  }
} {c3 65 p3 0 c3 68 p3 0}
do_test fkey5-5.2 {
  db eval {
    INSERT INTO c7 SELECT x FROM c3;
    INSERT INTO c7 VALUES('Alpha'),('alpha'),('foxtrot');
    DELETE FROM c3;
    PRAGMA foreign_key_check;
  }
} {c7 1 p3 0 c7 3 p3 0 c7 4 p3 0 c7 6 p3 0}
do_test fkey5-5.3 {
  db eval {
    PRAGMA foreign_key_check(c7);
  }
} {c7 1 p3 0 c7 3 p3 0 c7 4 p3 0 c7 6 p3 0}
do_test fkey5-5.4 {
  db eval {
    INSERT INTO c11 SELECT x FROM c7;
    DELETE FROM c7;
    PRAGMA foreign_key_check;
  }
} {c11 1 p3 0 c11 3 p3 0 c11 4 p3 0 c11 6 p3 0}
do_test fkey5-5.5 {
  db eval {
    PRAGMA foreign_key_check(c11);
  }
} {c11 1 p3 0 c11 3 p3 0 c11 4 p3 0 c11 6 p3 0}

do_test fkey5-6.0 {
  db eval {
    DELETE FROM c11;
    INSERT INTO c4 VALUES(54),(55),(56);
    PRAGMA foreign_key_check;
  }
} {c4 54 p4 0 c4 56 p4 0}
do_test fkey5-6.1 {
  db eval {
    PRAGMA foreign_key_check(c4);
  }
} {c4 54 p4 0 c4 56 p4 0}
do_test fkey5-6.2 {
  db eval {
    INSERT INTO c8 SELECT x FROM c4;
    INSERT INTO c8 VALUES('Alpha'),('ALPHA'),('foxtrot');
    DELETE FROM c4;
    PRAGMA foreign_key_check;
  }
} {c8 1 p4 0 c8 3 p4 0 c8 6 p4 0}
do_test fkey5-6.3 {
  db eval {
    PRAGMA foreign_key_check(c8);
  }
} {c8 1 p4 0 c8 3 p4 0 c8 6 p4 0}
do_test fkey5-6.4 {
  db eval {
    INSERT INTO c12 SELECT x FROM c8;
    DELETE FROM c8;
    PRAGMA foreign_key_check;
  }
} {c12 1 p4 0 c12 3 p4 0 c12 6 p4 0}
do_test fkey5-6.5 {
  db eval {
    PRAGMA foreign_key_check(c12);
  }
} {c12 1 p4 0 c12 3 p4 0 c12 6 p4 0}

do_test fkey5-7.1 {
  set res {}
  db eval {
    INSERT OR IGNORE INTO c13 SELECT * FROM c12;
    INSERT OR IGNORE INTO C14 SELECT * FROM c12;
    DELETE FROM c12;
    PRAGMA foreign_key_check;
  } {
    lappend res [list $table $rowid $fkid $parent]
  }
  lsort $res
} {{c13 1 0 p3} {c13 2 0 p3} {c13 3 0 p3} {c13 4 0 p3} {c13 5 0 p3} {c13 6 0 p3} {c14 1 0 p4} {c14 3 0 p4} {c14 6 0 p4}}
do_test fkey5-7.2 {
  db eval {
    PRAGMA foreign_key_check(c14);
  }
} {c14 1 p4 0 c14 3 p4 0 c14 6 p4 0}
do_test fkey5-7.3 {
  db eval {
    PRAGMA foreign_key_check(c13);
  }
} {c13 1 p3 0 c13 2 p3 0 c13 3 p3 0 c13 4 p3 0 c13 5 p3 0 c13 6 p3 0}

do_test fkey5-8.0 {
  db eval {
    DELETE FROM c13;
    DELETE FROM c14;
    INSERT INTO c19 VALUES('alpha','abc');
    PRAGMA foreign_key_check(c19);
  }
} {c19 1 p5 0}
do_test fkey5-8.1 {
  db eval {
    DELETE FROM c19;
    INSERT INTO c19 VALUES('Alpha','abc');
    PRAGMA foreign_key_check(c19);
  }
} {}
do_test fkey5-8.2 {
  db eval {
    INSERT INTO c20 VALUES('Alpha','abc');
    PRAGMA foreign_key_check(c20);
  }
} {c20 1 p5 0}
do_test fkey5-8.3 {
  db eval {
    DELETE FROM c20;
    INSERT INTO c20 VALUES('abc','Alpha');
    PRAGMA foreign_key_check(c20);
  }
} {}
do_test fkey5-8.4 {
  db eval {
    INSERT INTO c21 VALUES('alpha','abc    ');
    PRAGMA foreign_key_check(c21);
  }
} {}
do_test fkey5-8.5 {
  db eval {
    DELETE FROM c21;
    INSERT INTO c19 VALUES('Alpha','abc');
    PRAGMA foreign_key_check(c21);
  }
} {}
do_test fkey5-8.6 {
  db eval {
    INSERT INTO c22 VALUES('Alpha','abc');
    PRAGMA foreign_key_check(c22);
  }
} {c22 1 p6 0}
do_test fkey5-8.7 {
  db eval {
    DELETE FROM c22;
    INSERT INTO c22 VALUES('abc  ','ALPHA');
    PRAGMA foreign_key_check(c22);
  }
} {}


#-------------------------------------------------------------------------
# Tests 9.* verify that missing parent tables are handled correctly.
#
do_execsql_test 9.1.1 {
  CREATE TABLE k1(x REFERENCES s1);
  PRAGMA foreign_key_check(k1);
} {}
do_execsql_test 9.1.2 {
  INSERT INTO k1 VALUES(NULL);
  PRAGMA foreign_key_check(k1);
} {}
do_execsql_test 9.1.3 {
  INSERT INTO k1 VALUES(1);
  PRAGMA foreign_key_check(k1);
} {k1 2 s1 0}

do_execsql_test 9.2.1 {
  CREATE TABLE k2(x, y, FOREIGN KEY(x, y) REFERENCES s1(a, b));
  PRAGMA foreign_key_check(k2);
} {}
do_execsql_test 9.2 {
  INSERT INTO k2 VALUES(NULL, 'five');
  PRAGMA foreign_key_check(k2);
} {}
do_execsql_test 9.3 {
  INSERT INTO k2 VALUES('one', NULL);
  PRAGMA foreign_key_check(k2);
} {}
do_execsql_test 9.4 {
  INSERT INTO k2 VALUES('six', 'seven');
  PRAGMA foreign_key_check(k2);
} {k2 3 s1 0}

#-------------------------------------------------------------------------
# Test using a WITHOUT ROWID table as the child table with an INTEGER 
# PRIMARY KEY as the parent key.
#
reset_db
do_execsql_test 10.1 {
  CREATE TABLE p30 (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS c30 (
      line INTEGER, 
      master REFERENCES p30(id), 
      PRIMARY KEY(master)
  ) WITHOUT ROWID;

  INSERT INTO p30 (id) VALUES (1);
  INSERT INTO c30 (master, line)  VALUES (1, 999);
}
do_execsql_test 10.2 {
  PRAGMA foreign_key_check;
}
# EVIDENCE-OF: R-00471-55166 The second column is the rowid of the row
# that contains the invalid REFERENCES clause, or NULL if the child
# table is a WITHOUT ROWID table.
do_execsql_test 10.3 {
  INSERT INTO c30 VALUES(45, 45);
  PRAGMA foreign_key_check;
} {c30 {} p30 0}

#-------------------------------------------------------------------------
# Test "foreign key mismatch" errors.
#
reset_db
do_execsql_test 11.0 {
  CREATE TABLE tt(y);
  CREATE TABLE c11(x REFERENCES tt(y));
}
do_catchsql_test 11.1 {
  PRAGMA foreign_key_check;
} {1 {foreign key mismatch - "c11" referencing "tt"}}

# 2020-07-03 Bug in foreign_key_check discovered while working on the
# forum reports that pragma_foreign_key_check does not accept an argument:
# If two separate schemas seem to reference one another, that causes
# problems for foreign_key_check.
#
reset_db
do_execsql_test 12.0 {
  ATTACH ':memory:' as aux;
  CREATE TABLE aux.t1(a INTEGER PRIMARY KEY, b TEXT REFERENCES t2);
  CREATE TABLE main.t2(x TEXT PRIMARY KEY, y INT);
  INSERT INTO main.t2 VALUES('abc',11),('def',22),('xyz',99);
  INSERT INTO aux.t1 VALUES(5,'abc'),(7,'xyz'),(9,'oops');
  PRAGMA foreign_key_check=t1;
} {t1 5 t2 0 t1 7 t2 0 t1 9 t2 0}
do_execsql_test 12.1 {
  CREATE TABLE aux.t2(x TEXT PRIMARY KEY, y INT);
  INSERT INTO aux.t2 VALUES('abc',11),('def',22),('xyz',99);
  PRAGMA foreign_key_check=t1;
} {t1 9 t2 0}

# 2020-07-03: the pragma_foreign_key_check virtual table should
# accept arguments for the table name and/or schema name.
#
ifcapable vtab {
  do_execsql_test 13.0 {
    SELECT *, 'x' FROM pragma_foreign_key_check('t1');
  } {t1 9 t2 0 x}
  do_catchsql_test 13.1 {
    SELECT *, 'x' FROM pragma_foreign_key_check('t1','main');
  } {1 {no such table: main.t1}}
  do_execsql_test 13.2 {
    SELECT *, 'x' FROM pragma_foreign_key_check('t1','aux');
  } {t1 9 t2 0 x}
}

ifcapable vtab {
  reset_db
    do_execsql_test 13.10 {
      PRAGMA foreign_keys=OFF;
      CREATE TABLE t1(a INTEGER PRIMARY KEY, b TEXT REFERENCES t2);
      CREATE TABLE t2(x TEXT PRIMARY KEY, y INT);
      CREATE TABLE t3(w TEXT, z INT REFERENCES t1);
      INSERT INTO t2 VALUES('abc',11),('def',22),('xyz',99);
      INSERT INTO t1 VALUES(5,'abc'),(7,'xyz'),(9,'oops');
      INSERT INTO t3 VALUES(11,7),(22,19);
    } {}
  do_execsql_test 13.11 {
    SELECT x.*, '|'
      FROM sqlite_schema, pragma_foreign_key_check(name) AS x
      WHERE type='table'
      ORDER BY x."table";
  } {t1 9 t2 0 | t3 2 t1 0 |}
  do_execsql_test 13.12 {
    SELECT *, '|'
      FROM pragma_foreign_key_check AS x
      ORDER BY x."table";
  } {t1 9 t2 0 | t3 2 t1 0 |}
}

finish_test
