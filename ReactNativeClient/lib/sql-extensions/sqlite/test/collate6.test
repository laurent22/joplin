#
# 2001 September 15
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
# focus of this script is collation sequences in concert with triggers.
#
# $Id: collate6.test,v 1.4 2007/07/30 14:40:48 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# There are no tests in this file that will work without
# trigger support.
#
ifcapable {!trigger} {
  finish_test
  return
}

# Create a case-insensitive collation type NOCASE for use in testing. 
# Normally, capital letters are less than their lower-case counterparts.
db collate NOCASE nocase_collate
proc nocase_collate {a b} {
  return [string compare -nocase $a $b]
}

#
# Tests are organized as follows:
# collate6-1.* - triggers.
#

do_test collate6-1.0 {
  execsql {
    CREATE TABLE collate6log(a, b);
    CREATE TABLE collate6tab(a COLLATE NOCASE, b COLLATE BINARY);
  }
} {}

# Test that the default collation sequence applies to new.* references 
# in WHEN clauses.
do_test collate6-1.1 {
  execsql {
    CREATE TRIGGER collate6trig BEFORE INSERT ON collate6tab 
      WHEN new.a = 'a' BEGIN
        INSERT INTO collate6log VALUES(new.a, new.b);
    END;
  }
} {}
do_test collate6-1.2 {
  execsql {
    INSERT INTO collate6tab VALUES('a', 'b');
    SELECT * FROM collate6log;
  }
} {a b}
do_test collate6-1.3 {
  execsql {
    INSERT INTO collate6tab VALUES('A', 'B');
    SELECT * FROM collate6log;
  }
} {a b A B}
do_test collate6-1.4 {
  execsql {
    DROP TRIGGER collate6trig;
    DELETE FROM collate6log;
  } 
} {}

# Test that the default collation sequence applies to new.* references 
# in the body of triggers.
do_test collate6-1.5 {
  execsql {
    CREATE TRIGGER collate6trig BEFORE INSERT ON collate6tab BEGIN
      INSERT INTO collate6log VALUES(new.a='a', new.b='b');
    END;
  }
} {}
do_test collate6-1.6 {
  execsql {
    INSERT INTO collate6tab VALUES('a', 'b');
    SELECT * FROM collate6log;
  }
} {1 1}
do_test collate6-1.7 {
  execsql {
    INSERT INTO collate6tab VALUES('A', 'B');
    SELECT * FROM collate6log;
  }
} {1 1 1 0}
do_test collate6-1.8 {
  execsql {
    DROP TRIGGER collate6trig;
    DELETE FROM collate6log;
  } 
} {}

do_test collate6-1.9 {
  execsql {
    DROP TABLE collate6tab;
  }
} {}

# Test that an explicit collation sequence overrides an implicit 
# one attached to a 'new' reference.
#
do_test collate6-2.1 {
  execsql {
    CREATE TABLE abc(a COLLATE binary, b, c);
    CREATE TABLE def(a, b, c);
    CREATE TRIGGER abc_t1 AFTER INSERT ON abc BEGIN
      INSERT INTO def SELECT * FROM abc WHERE a < new.a COLLATE nocase;
    END
  }
} {}
do_test collate6-2.2 {
  execsql {
    INSERT INTO abc VALUES('One', 'Two', 'Three');
    INSERT INTO abc VALUES('one', 'two', 'three');
    SELECT * FROM def;
  }
} {}
do_test collate6-2.3 {
  execsql {
    UPDATE abc SET a = 'four' WHERE a = 'one';
    CREATE TRIGGER abc_t2 AFTER UPDATE ON abc BEGIN
      INSERT INTO def SELECT * FROM abc WHERE a < new.a COLLATE nocase;
    END;
    SELECT * FROM def;
  }
} {}

# At one point the 6-3.2 (but not 6-3.1) was causing an assert() to fail.
#
do_test collate6-3.1 {
  execsql {
    SELECT 1 FROM sqlite_master WHERE name COLLATE nocase = 'hello';
  }
} {}
do_test collate6-3.2 {
  execsql {
    SELECT 1 FROM sqlite_master WHERE 'hello' = name COLLATE nocase;
  }
} {}


finish_test
