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
# Tests to make sure that values returned by changes() and total_changes()
# are updated properly, especially inside triggers
#
# Note 1: changes() remains constant within a statement and only updates
#         once the statement is finished (triggers count as part of
#         statement).
# Note 2: changes() is changed within the context of a trigger much like 
#         last_insert_rowid() (see lastinsert.test), but is restored once
#         the trigger exits.
# Note 3: changes() is not changed by a change to a view (since everything
#         is done within instead of trigger context).
#
# $Id: laststmtchanges.test,v 1.7 2008/10/27 13:59:34 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# ----------------------------------------------------------------------------
# 1.x - basic tests (no triggers)

# changes() set properly after insert
do_test laststmtchanges-1.1 {
    catchsql {
        create table t0 (x);
        insert into t0 values (1);
        insert into t0 values (1);
        insert into t0 values (2);
        insert into t0 values (2);
        insert into t0 values (1);
        insert into t0 values (1);
        insert into t0 values (1);
        insert into t0 values (2);
        select changes(), total_changes();
    }
} {0 {1 8}}

# changes() set properly after update
do_test laststmtchanges-1.2 {
    catchsql {
        update t0 set x=3 where x=1;
        select changes(), total_changes();
    }
} {0 {5 13}}

# There was some goofy change-counting logic in sqlite3_exec() that
# appears to have been left over from SQLite version 2.  This test
# makes sure it has been removed.
#
do_test laststmtchanges-1.2.1 {
    db cache flush
    sqlite3_exec_printf db {update t0 set x=4 where x=3; select 1;} {}
    execsql {select changes()}
} {5}

# changes() unchanged within an update statement
do_test laststmtchanges-1.3 {
    execsql {update t0 set x=3 where x=4}
    catchsql {
        update t0 set x=x+changes() where x=3;
        select count() from t0 where x=8;
    }
} {0 5}

# changes() set properly after update on table where no rows changed
do_test laststmtchanges-1.4 {
    catchsql {
        update t0 set x=77 where x=88;
        select changes();
    }
} {0 0}

# changes() set properly after delete from table
do_test laststmtchanges-1.5 {
    catchsql {
        delete from t0 where x=2;
        select changes();
    }
} {0 3}

# All remaining tests involve triggers.  Skip them if triggers are not
# supported in this build.
#
ifcapable {!trigger} {
  finish_test
  return
}


# ----------------------------------------------------------------------------
# 2.x - tests with after insert trigger

# changes() changed properly after insert into table containing after trigger
do_test laststmtchanges-2.1 {
    set ::tc [db total_changes]
    catchsql {
        create table t1 (k integer primary key);
        create table t2 (k integer primary key, v1, v2);
        create trigger r1 after insert on t1 for each row begin
            insert into t2 values (NULL, changes(), NULL);
            update t0 set x=x;
            update t2 set v2=changes();
        end;
        insert into t1 values (77);
        select changes();
    }
} {0 1}

# changes() unchanged upon entry into after insert trigger
do_test laststmtchanges-2.2 {
    catchsql {
        select v1 from t2;
    }
} {0 3}

# changes() changed properly by update within context of after insert trigger
do_test laststmtchanges-2.3 {
    catchsql {
        select v2 from t2;
    }
} {0 5}

# Total changes caused by firing the trigger above:
#
#   1 from "insert into t1 values(77)" + 
#   1 from "insert into t2 values (NULL, changes(), NULL);" +
#   5 from "update t0 set x=x;" +
#   1 from "update t2 set v2=changes();"
#
do_test laststmtchanges-2.4 {
  expr [db total_changes] - $::tc
} {8}

# ----------------------------------------------------------------------------
# 3.x - tests with after update trigger

# changes() changed properly after update into table containing after trigger
do_test laststmtchanges-3.1 {
    catchsql {
        drop trigger r1;
        delete from t2; delete from t2;
        create trigger r1 after update on t1 for each row begin
            insert into t2 values (NULL, changes(), NULL);
            delete from t0 where oid=1 or oid=2;
            update t2 set v2=changes();
        end;
        update t1 set k=k;
        select changes();
    }
} {0 1}

# changes() unchanged upon entry into after update trigger
do_test laststmtchanges-3.2 {
    catchsql {
        select v1 from t2;
    }
} {0 0}

# changes() changed properly by delete within context of after update trigger
do_test laststmtchanges-3.3 {
    catchsql {
        select v2 from t2;
    }
} {0 2}

# ----------------------------------------------------------------------------
# 4.x - tests with before delete trigger

# changes() changed properly on delete from table containing before trigger
do_test laststmtchanges-4.1 {
    catchsql {
        drop trigger r1;
        delete from t2; delete from t2;
        create trigger r1 before delete on t1 for each row begin
            insert into t2 values (NULL, changes(), NULL);
            insert into t0 values (5);
            update t2 set v2=changes();
        end;
        delete from t1;
        select changes();
    }
} {0 1}

# changes() unchanged upon entry into before delete trigger
do_test laststmtchanges-4.2 {
    catchsql {
        select v1 from t2;
    }
} {0 0}

# changes() changed properly by insert within context of before delete trigger
do_test laststmtchanges-4.3 {
    catchsql {
        select v2 from t2;
    }
} {0 1}

# ----------------------------------------------------------------------------
# 5.x - complex tests with temporary tables and nested instead of triggers
# These tests cannot run if the library does not have view support enabled.

ifcapable view&&tempdb {

do_test laststmtchanges-5.1 {
    catchsql {
        drop table t0; drop table t1; drop table t2;
        create temp table t0(x);
        create temp table t1 (k integer primary key);
        create temp table t2 (k integer primary key);
        create temp view v1 as select * from t1;
        create temp view v2 as select * from t2;
        create temp table n1 (k integer primary key, n);
        create temp table n2 (k integer primary key, n);
        insert into t0 values (1);
        insert into t0 values (2);
        insert into t0 values (1);
        insert into t0 values (1);
        insert into t0 values (1);
        insert into t0 values (2);
        insert into t0 values (2);
        insert into t0 values (1);
        create temp trigger r1 instead of insert on v1 for each row begin
            insert into n1 values (NULL, changes());
            update t0 set x=x*10 where x=1;
            insert into n1 values (NULL, changes());
            insert into t1 values (NEW.k);
            insert into n1 values (NULL, changes());
            update t0 set x=x*10 where x=0;
            insert into v2 values (100+NEW.k);
            insert into n1 values (NULL, changes());
        end;
        create temp trigger r2 instead of insert on v2 for each row begin
            insert into n2 values (NULL, changes());
            insert into t2 values (1000+NEW.k);
            insert into n2 values (NULL, changes());
            update t0 set x=x*100 where x=0;
            insert into n2 values (NULL, changes());
            delete from t0 where x=2;
            insert into n2 values (NULL, changes());
        end;
        insert into t1 values (77);
        select changes();
    }
} {0 1}

do_test laststmtchanges-5.2 {
    catchsql {
        delete from t1 where k=88;
        select changes();
    }
} {0 0}

do_test laststmtchanges-5.3 {
    catchsql {
        insert into v1 values (5);
        select changes();
    }
} {0 0}

do_test laststmtchanges-5.4 {
    catchsql {
        select n from n1;
    }
} {0 {0 5 1 0}}

do_test laststmtchanges-5.5 {
    catchsql {
        select n from n2;
    }
} {0 {0 1 0 3}}

} ;# ifcapable view


# ----------------------------------------------------------------------------
# 6.x - Test "DELETE FROM <table>" in the absence of triggers
#
do_test laststmtchanges-6.1 {
  execsql {
    CREATE TABLE t3(a, b, c);
    INSERT INTO t3 VALUES(1, 2, 3);
    INSERT INTO t3 VALUES(4, 5, 6);
  }
} {}
do_test laststmtchanges-6.2 {
  execsql {
    BEGIN;
    DELETE FROM t3;
    SELECT changes();
  }
} {2}
do_test laststmtchanges-6.3 {
  execsql {
    ROLLBACK;
    BEGIN;
    DELETE FROM t3 WHERE a IS NOT NULL;
    SELECT changes();
  }
} {2}
do_test laststmtchanges-6.4 {
  execsql {
    ROLLBACK;
    CREATE INDEX t3_i1 ON t3(a);
    BEGIN;
    DELETE FROM t3;
    SELECT changes();
  }
} {2}
do_test laststmtchanges-6.5 {
  execsql { ROLLBACK }
  set nTotalChange [execsql {SELECT total_changes()}]
  expr 0
} {0}
do_test laststmtchanges-6.6 {
  execsql {
    SELECT total_changes();
    DELETE FROM t3;
    SELECT total_changes();
  }
} [list $nTotalChange [expr $nTotalChange+2]]

finish_test
