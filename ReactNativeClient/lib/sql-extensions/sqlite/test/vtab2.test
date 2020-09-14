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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix vtab2

ifcapable !vtab||!schema_pragmas {
  finish_test
  return
}

register_schema_module [sqlite3_connection_pointer db]
do_test vtab2-1.1 {
  execsql {
    CREATE VIRTUAL TABLE schema USING schema;
    SELECT * FROM schema;
  }
} [list \
  main schema 0 database   {} 0 {} 0 \
  main schema 1 tablename  {} 0 {} 0 \
  main schema 2 cid        {} 0 {} 0 \
  main schema 3 name       {} 0 {} 0 \
  main schema 4 type       {} 0 {} 0 \
  main schema 5 not_null   {} 0 {} 0 \
  main schema 6 dflt_value {} 0 {} 0 \
  main schema 7 pk         {} 0 {} 0 \
]

# See ticket #2230.
#
do_test vtab2-1.2 {
  execsql {
    SELECT length(tablename) FROM schema GROUP by tablename;
  }
} {6}
do_test vtab2-1.3 {
  execsql {
    SELECT tablename FROM schema GROUP by length(tablename);
  }
} {schema}
do_test vtab2-1.4 {
  execsql {
    SELECT length(tablename) FROM schema GROUP by length(tablename);
  }
} {6}

register_tclvar_module [sqlite3_connection_pointer db]
do_test vtab2-2.1 {
  set ::abc 123
  execsql {
    CREATE VIRTUAL TABLE vars USING tclvar;
    SELECT name, arrayname, value FROM vars WHERE name='abc';
  }
} [list abc "" 123]
do_test vtab2-2.2 {
  set A(1) 1
  set A(2) 4
  set A(3) 9
  execsql {
    SELECT name, arrayname, value FROM vars WHERE name='A';
  }
} [list A 1 1 A 2 4 A 3 9]
unset -nocomplain result
unset -nocomplain var
set result {}
foreach var [lsort [info vars tcl_*]] {
  catch {lappend result $var [set $var]}
}
do_test vtab2-2.3 {
  execsql {
    SELECT name, value FROM vars
      WHERE name MATCH 'tcl_*' AND arrayname = '' 
      ORDER BY name;
  }
} $result
unset result
unset var

# Ticket #2894.
#
# Make sure we do call Column(), and Rowid() methods of
# a virtual table when that table is in a LEFT JOIN.
#
do_test vtab2-3.1 {
  execsql {
    SELECT * FROM schema WHERE dflt_value IS NULL LIMIT 1
  }
} {main schema 0 database {} 0 {} 0}
do_test vtab2-3.2 {
  execsql {
    SELECT *, b.rowid
      FROM schema a LEFT JOIN schema b ON a.dflt_value=b.dflt_value
     WHERE a.rowid=1
  }
} {main schema 0 database {} 0 {} 0 {} {} {} {} {} {} {} {} {}}
do_test vtab2-3.3 {
  execsql {
    SELECT *, b.rowid
      FROM schema a LEFT JOIN schema b ON a.dflt_value IS b.dflt_value
                                      AND a.dflt_value IS NOT NULL
     WHERE a.rowid=1
  }
} {main schema 0 database {} 0 {} 0 {} {} {} {} {} {} {} {} {}}

do_test vtab2-4.1 {
  execsql {
    BEGIN TRANSACTION;
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, UNIQUE(b, c));
    CREATE TABLE fkey(
      to_tbl,
      to_col
    );
    INSERT INTO "fkey" VALUES('t1',NULL);
    COMMIT;
  }
} {}
do_test vtab2-4.2 {
  execsql { CREATE VIRTUAL TABLE v_col USING schema }
} {}
do_test vtab2-4.3 {
  execsql { SELECT name FROM v_col WHERE tablename = 't1' AND pk }
} {a}
do_test vtab2-4.4 {
  execsql {
    UPDATE fkey 
    SET to_col = (SELECT name FROM v_col WHERE tablename = 't1' AND pk);
  }
} {}
do_test vtab2-4.5 {
  execsql { SELECT * FROM fkey }
} {t1 a}

#-------------------------------------------------------------------------
#
ifcapable fts3 {
  reset_db
  do_execsql_test 5.1 {
    PRAGMA encoding='UTF16';
  }

  do_test 5.2 {
    sqlite3_exec_hex db { CREATE VIRTUAL TABLE %C8 USING fts3 }
  } {0 {}}

  do_test 5.3 {
    sqlite3_exec_hex db { CREATE VIRTUAL TABLE %C9 USING s }
  } {/1 {malformed database schema.* already exists}/}
}



finish_test
