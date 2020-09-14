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
# This file implements regression tests for SQLite library.
#
# $Id: vtab5.test,v 1.8 2008/07/12 14:52:21 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

# The following tests - vtab5-1.* - ensure that an INSERT, DELETE or UPDATE
# statement can be executed immediately after a CREATE or schema reload. The
# point here is testing that the parser always calls xConnect() before the
# schema of a virtual table is used.
#
register_echo_module [sqlite3_connection_pointer db]
do_test vtab5-1.1 {
  execsql {
    CREATE TABLE treal(a VARCHAR(16), b INTEGER, c FLOAT);
    INSERT INTO treal VALUES('a', 'b', 'c');
    CREATE VIRTUAL TABLE techo USING echo(treal);
  }
} {}
do_test vtab5.1.2 {
  execsql {
    SELECT * FROM techo;
  }
} {a b c}
do_test vtab5.1.3 {
  db close
  sqlite3 db test.db
  register_echo_module [sqlite3_connection_pointer db]
  execsql {
    INSERT INTO techo VALUES('c', 'd', 'e');
    SELECT * FROM techo;
  }
} {a b c c d e}
do_test vtab5.1.4 {
  db close
  sqlite3 db test.db
  register_echo_module [sqlite3_connection_pointer db]
  execsql {
    UPDATE techo SET a = 10;
    SELECT * FROM techo;
  }
} {10 b c 10 d e}
do_test vtab5.1.5 {
  db close
  sqlite3 db test.db
  register_echo_module [sqlite3_connection_pointer db]
  execsql {
    DELETE FROM techo WHERE b > 'c';
    SELECT * FROM techo;
  }
} {10 b c}
do_test vtab5.1.X {
  execsql {
    DROP TABLE techo;
    DROP TABLE treal;
  }
} {}

# The following tests - vtab5-2.* - ensure that collation sequences
# assigned to virtual table columns via the "CREATE TABLE" statement 
# passed to sqlite3_declare_vtab() are used correctly.
#
do_test vtab5.2.1 {
  execsql {
    CREATE TABLE strings(str COLLATE NOCASE);
    INSERT INTO strings VALUES('abc1');
    INSERT INTO strings VALUES('Abc3');
    INSERT INTO strings VALUES('ABc2');
    INSERT INTO strings VALUES('aBc4');
    SELECT str FROM strings ORDER BY 1;
  }
} {abc1 ABc2 Abc3 aBc4}
do_test vtab5.2.2 {
  execsql {
    CREATE VIRTUAL TABLE echo_strings USING echo(strings);
    SELECT str FROM echo_strings ORDER BY 1;
  }
} {abc1 ABc2 Abc3 aBc4}
do_test vtab5.2.3 {
  execsql {
    SELECT str||'' FROM echo_strings ORDER BY 1;
  }
} {ABc2 Abc3 aBc4 abc1}

# Test that it is impossible to create a triggger on a virtual table.
#
ifcapable trigger {
  do_test vtab5.3.1 {
    catchsql {
      CREATE TRIGGER trig INSTEAD OF INSERT ON echo_strings BEGIN
        SELECT 1, 2, 3;
      END;
    }
  } {1 {cannot create triggers on virtual tables}}
  do_test vtab5.3.2 {
    catchsql {
      CREATE TRIGGER trig AFTER INSERT ON echo_strings BEGIN
        SELECT 1, 2, 3;
      END;
    }
  } {1 {cannot create triggers on virtual tables}}
  do_test vtab5.3.2 {
    catchsql {
      CREATE TRIGGER trig BEFORE INSERT ON echo_strings BEGIN
        SELECT 1, 2, 3;
      END;
    }
  } {1 {cannot create triggers on virtual tables}}
}

# Test that it is impossible to create an index on a virtual table.
#
do_test vtab5.4.1 {
  catchsql {
    CREATE INDEX echo_strings_i ON echo_strings(str);
  }
} {1 {virtual tables may not be indexed}}

# Test that it is impossible to add a column to a virtual table.
#
ifcapable altertable {
  do_test vtab5.4.2 {
    catchsql {
      ALTER TABLE echo_strings ADD COLUMN col2;
    }
  } {1 {virtual tables may not be altered}}
}

# Test that it is impossible to rename a virtual table.
# UPDATE: It is now possible.
#
# do_test vtab5.4.3 {
#   catchsql {
#     ALTER TABLE echo_strings RENAME TO echo_strings2;
#   }
# } {1 {virtual tables may not be altered}}

finish_test
