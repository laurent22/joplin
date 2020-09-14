# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file tests the RAISE() function.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

# The tests in this file were written before SQLite supported recursive }
# trigger invocation, and some tests depend on that to pass. So disable
# recursive triggers for this file.
catchsql { pragma recursive_triggers = off } 

# Test that we can cause ROLLBACK, FAIL and ABORT correctly
#
catchsql { CREATE TABLE tbl(a, b ,c) }
execsql {
    CREATE TRIGGER before_tbl_insert BEFORE INSERT ON tbl BEGIN SELECT CASE 
        WHEN (new.a = 4) THEN RAISE(IGNORE) END;
    END;

    CREATE TRIGGER after_tbl_insert AFTER INSERT ON tbl BEGIN SELECT CASE 
        WHEN (new.a = 1) THEN RAISE(ABORT,    'Trigger abort') 
        WHEN (new.a = 2) THEN RAISE(FAIL,     'Trigger fail') 
        WHEN (new.a = 3) THEN RAISE(ROLLBACK, 'Trigger rollback') END;
    END;
}
# ABORT
do_test trigger3-1.1 {
    catchsql {
        BEGIN;
        INSERT INTO tbl VALUES (5, 5, 6);
        INSERT INTO tbl VALUES (1, 5, 6);
    }
} {1 {Trigger abort}}
verify_ex_errcode trigger3-1.1b SQLITE_CONSTRAINT_TRIGGER
do_test trigger3-1.2 {
    execsql {
        SELECT * FROM tbl;
        ROLLBACK;
    }
} {5 5 6}
do_test trigger3-1.3 {
    execsql {SELECT * FROM tbl}
} {}

# FAIL
do_test trigger3-2.1 {
    catchsql {
        BEGIN;
        INSERT INTO tbl VALUES (5, 5, 6);
        INSERT INTO tbl VALUES (2, 5, 6);
    }
} {1 {Trigger fail}}
verify_ex_errcode trigger3-2.1b SQLITE_CONSTRAINT_TRIGGER
do_test trigger3-2.2 {
    execsql {
        SELECT * FROM tbl;
        ROLLBACK;
    }
} {5 5 6 2 5 6}
# ROLLBACK
do_test trigger3-3.1 {
    catchsql {
        BEGIN;
        INSERT INTO tbl VALUES (5, 5, 6);
        INSERT INTO tbl VALUES (3, 5, 6);
    }
} {1 {Trigger rollback}}
verify_ex_errcode trigger3-3.1b SQLITE_CONSTRAINT_TRIGGER
do_test trigger3-3.2 {
    execsql {
        SELECT * FROM tbl;
    }
} {}

# Verify that a ROLLBACK trigger works like a FAIL trigger if
# we are not within a transaction.  Ticket #3035.
#
do_test trigger3-3.3 {
    catchsql {COMMIT}
    catchsql {
        INSERT INTO tbl VALUES (3, 9, 10);
    }
} {1 {Trigger rollback}}
verify_ex_errcode trigger3-3.3b SQLITE_CONSTRAINT_TRIGGER
do_test trigger3-3.4 {
    execsql {SELECT * FROM tbl}
} {}

# IGNORE
do_test trigger3-4.1 {
    catchsql {
        BEGIN;
        INSERT INTO tbl VALUES (5, 5, 6);
        INSERT INTO tbl VALUES (4, 5, 6);
    }
} {0 {}}
do_test trigger3-4.2 {
    execsql {
        SELECT * FROM tbl;
        ROLLBACK;
    }
} {5 5 6}

# Check that we can also do RAISE(IGNORE) for UPDATE and DELETE
execsql {DROP TABLE tbl;}
execsql {CREATE TABLE tbl (a, b, c);}
execsql {INSERT INTO tbl VALUES(1, 2, 3);}
execsql {INSERT INTO tbl VALUES(4, 5, 6);}
execsql {
    CREATE TRIGGER before_tbl_update BEFORE UPDATE ON tbl BEGIN
        SELECT CASE WHEN (old.a = 1) THEN RAISE(IGNORE) END;
    END;

    CREATE TRIGGER before_tbl_delete BEFORE DELETE ON tbl BEGIN
        SELECT CASE WHEN (old.a = 1) THEN RAISE(IGNORE) END;
    END;
}
do_test trigger3-5.1 {
    execsql {
        UPDATE tbl SET c = 10;
        SELECT * FROM tbl;
    }
} {1 2 3 4 5 10}
do_test trigger3-5.2 {
    execsql {
        DELETE FROM tbl;
        SELECT * FROM tbl;
    }
} {1 2 3}

# Check that RAISE(IGNORE) works correctly for nested triggers:
execsql {CREATE TABLE tbl2(a, b, c)}
execsql {
    CREATE TRIGGER after_tbl2_insert AFTER INSERT ON tbl2 BEGIN
        UPDATE tbl SET c = 10;
        INSERT INTO tbl2 VALUES (new.a, new.b, new.c);
    END;
}
do_test trigger3-6 {
    execsql {
        INSERT INTO tbl2 VALUES (1, 2, 3);
        SELECT * FROM tbl2;
        SELECT * FROM tbl;
    }
} {1 2 3 1 2 3 1 2 3}

# Check that things also work for view-triggers

ifcapable view {

execsql {CREATE VIEW tbl_view AS SELECT * FROM tbl}
execsql {
    CREATE TRIGGER tbl_view_insert INSTEAD OF INSERT ON tbl_view BEGIN
        SELECT CASE WHEN (new.a = 1) THEN RAISE(ROLLBACK, 'View rollback')
                    WHEN (new.a = 2) THEN RAISE(IGNORE) 
                    WHEN (new.a = 3) THEN RAISE(ABORT, 'View abort') END;
    END;
}

do_test trigger3-7.1 {
    catchsql {
        INSERT INTO tbl_view VALUES(1, 2, 3);
    }
} {1 {View rollback}}
verify_ex_errcode trigger3-7.1b SQLITE_CONSTRAINT_TRIGGER
do_test trigger3-7.2 {
    catchsql {
        INSERT INTO tbl_view VALUES(2, 2, 3);
    }
} {0 {}}
do_test trigger3-7.3 {
    catchsql {
        INSERT INTO tbl_view VALUES(3, 2, 3);
    }
} {1 {View abort}}
verify_ex_errcode trigger3-7.3b SQLITE_CONSTRAINT_TRIGGER

} ;# ifcapable view

integrity_check trigger3-8.1

catchsql { DROP TABLE tbl; } 
catchsql { DROP TABLE tbl2; } 
catchsql { DROP VIEW tbl_view; }

finish_test
