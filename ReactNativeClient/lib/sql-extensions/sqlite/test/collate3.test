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
# focus of this script is page cache subsystem.
#
# $Id: collate3.test,v 1.13 2008/08/20 16:35:10 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

#
# Tests are organised as follows:
#
# collate3.1.* - Errors related to unknown collation sequences.
# collate3.2.* - Errors related to undefined collation sequences.
# collate3.3.* - Writing to a table that has an index with an undefined c.s.
# collate3.4.* - Misc errors.
# collate3.5.* - Collation factory.
#

#
# These tests ensure that when a user executes a statement with an 
# unknown collation sequence an error is returned.
#
do_test collate3-1.0 {
  execsql {
    CREATE TABLE collate3t1(c1 UNIQUE);
  }
} {}
do_test collate3-1.1 {
  catchsql {
    SELECT * FROM collate3t1 ORDER BY 1 collate garbage;
  }
} {1 {no such collation sequence: garbage}}
do_test collate3-1.1.2 {
  catchsql {
    SELECT DISTINCT c1 COLLATE garbage FROM collate3t1;
  }
} {1 {no such collation sequence: garbage}}
do_test collate3-1.2 {
  catchsql {
    CREATE TABLE collate3t2(c1 collate garbage);
  }
} {1 {no such collation sequence: garbage}}
do_test collate3-1.3 {
  catchsql {
    CREATE INDEX collate3i1 ON collate3t1(c1 COLLATE garbage);
  }
} {1 {no such collation sequence: garbage}}

execsql {
  DROP TABLE collate3t1;
}

proc caseless {a b} { string compare -nocase $a $b }
do_test collate3-1.4 {
  db collate caseless caseless
  execsql { 
    CREATE TABLE t1(a COLLATE caseless); 
    INSERT INTO t1 VALUES('Abc2');
    INSERT INTO t1 VALUES('abc1');
    INSERT INTO t1 VALUES('aBc3');
  }
  execsql { SELECT * FROM t1 ORDER BY a }
} {abc1 Abc2 aBc3}

do_test collate3-1.5 {
  db close
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 ORDER BY a }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.6.1 {
  db collate caseless caseless
  execsql { CREATE INDEX i1 ON t1(a) }
  execsql { SELECT * FROM t1 ORDER BY a }
} {abc1 Abc2 aBc3}

do_test collate3-1.6.2 {
  db close
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 ORDER BY a }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.6.3 {
  db close
  sqlite3 db test.db
  catchsql { PRAGMA integrity_check }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.6.4 {
  db close
  sqlite3 db test.db
  catchsql { REINDEX }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.7.1 {
  db collate caseless caseless
  execsql {
    DROP TABLE t1;
    CREATE TABLE t1(a);
    CREATE INDEX i1 ON t1(a COLLATE caseless);
    INSERT INTO t1 VALUES('Abc2');
    INSERT INTO t1 VALUES('abc1');
    INSERT INTO t1 VALUES('aBc3');
    SELECT * FROM t1 ORDER BY a COLLATE caseless;
  }
} {abc1 Abc2 aBc3}

do_test collate3-1.7.2 {
  db close
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 ORDER BY a COLLATE caseless}
} {1 {no such collation sequence: caseless}}

do_test collate3-1.7.4 {
  db close
  sqlite3 db test.db
  catchsql { REINDEX }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.7.3 {
  db close
  sqlite3 db test.db
  catchsql { PRAGMA integrity_check }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.7.4 {
  db close
  sqlite3 db test.db
  catchsql { REINDEX }
} {1 {no such collation sequence: caseless}}

do_test collate3-1.7.5 {
  db close
  sqlite3 db test.db
  db collate caseless caseless
  catchsql { PRAGMA integrity_check }
} {0 ok}

proc needed {nm} { db collate caseless caseless }
do_test collate3-1.7.6 {
  db close
  sqlite3 db test.db
  db collation_needed needed
  catchsql { PRAGMA integrity_check }
} {0 ok}

do_test collate3-1.8 {
  execsql { DROP TABLE t1 }
} {}

#
# Create a table with a default collation sequence, then close
# and re-open the database without re-registering the collation
# sequence. Then make sure the library stops us from using
# the collation sequence in:
# * an explicitly collated ORDER BY
# * an ORDER BY that uses the default collation sequence
# * an expression (=)
# * a CREATE TABLE statement
# * a CREATE INDEX statement that uses a default collation sequence
# * a GROUP BY that uses the default collation sequence
# * a SELECT DISTINCT that uses the default collation sequence
# * Compound SELECTs that uses the default collation sequence
# * An ORDER BY on a compound SELECT with an explicit ORDER BY.
#
do_test collate3-2.0 {
  db collate string_compare {string compare}
  execsql {
    CREATE TABLE collate3t1(c1 COLLATE string_compare, c2);
  }
  db close
  sqlite3 db test.db
  expr 0
} 0
do_test collate3-2.1 {
  catchsql {
    SELECT * FROM collate3t1 ORDER BY 1 COLLATE string_compare;
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-2.2 {
  catchsql {
    SELECT * FROM collate3t1 ORDER BY c1;
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-2.3 {
  catchsql {
    SELECT * FROM collate3t1 WHERE c1 = 'xxx';
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-2.4 {
  catchsql {
    CREATE TABLE collate3t2(c1 COLLATE string_compare);
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-2.5 {
  catchsql {
    CREATE INDEX collate3t1_i1 ON collate3t1(c1);
  }
} {1 {no such collation sequence: string_compare}}
do_test collate3-2.6 {
  catchsql {
    SELECT * FROM collate3t1;
  }
} {0 {}}
do_test collate3-2.7.1 {
  catchsql {
    SELECT count(*) FROM collate3t1 GROUP BY c1;
  }
} {1 {no such collation sequence: string_compare}} 
# do_test collate3-2.7.2 {
#   catchsql {
#     SELECT * FROM collate3t1 GROUP BY c1;
#   }
# } {1 {GROUP BY may only be used on aggregate queries}}
do_test collate3-2.7.2 {
  catchsql {
    SELECT * FROM collate3t1 GROUP BY c1;
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-2.8 {
  catchsql {
    SELECT DISTINCT c1 FROM collate3t1;
  }
} {1 {no such collation sequence: string_compare}} 

ifcapable compound {
  do_test collate3-2.9 {
    catchsql {
      SELECT c1 FROM collate3t1 UNION SELECT c1 FROM collate3t1;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.10 {
    catchsql {
      SELECT c1 FROM collate3t1 EXCEPT SELECT c1 FROM collate3t1;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.11 {
    catchsql {
      SELECT c1 FROM collate3t1 INTERSECT SELECT c1 FROM collate3t1;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.12 {
    catchsql {
      SELECT c1 FROM collate3t1 UNION ALL SELECT c1 FROM collate3t1;
    }
  } {0 {}}
  do_test collate3-2.13 {
    catchsql {
      SELECT 10 UNION ALL SELECT 20 ORDER BY 1 COLLATE string_compare;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.14 {
    catchsql {
      SELECT 10 INTERSECT SELECT 20 ORDER BY 1 COLLATE string_compare;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.15 {
    catchsql {
      SELECT 10 EXCEPT SELECT 20 ORDER BY 1 COLLATE string_compare;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.16 {
    catchsql {
      SELECT 10 UNION SELECT 20 ORDER BY 1 COLLATE string_compare;
    }
  } {1 {no such collation sequence: string_compare}} 
  do_test collate3-2.17 {
    catchsql {
      SELECT c1 FROM collate3t1 UNION ALL SELECT c1 FROM collate3t1 ORDER BY 1;
    }
  } {1 {no such collation sequence: string_compare}} 
} ;# ifcapable compound

#
# Create an index that uses a collation sequence then close and
# re-open the database without re-registering the collation
# sequence. Then check that for the table with the index 
# * An INSERT fails,
# * An UPDATE on the column with the index fails,
# * An UPDATE on a different column succeeds.
# * A DELETE with a WHERE clause fails
# * A DELETE without a WHERE clause succeeds
#
# Also, ensure that the restrictions tested by collate3-2.* still
# apply after the index has been created.
#
do_test collate3-3.0 {
  db collate string_compare {string compare}
  execsql {
    CREATE INDEX collate3t1_i1 ON collate3t1(c1);
    INSERT INTO collate3t1 VALUES('xxx', 'yyy');
  }
  db close
  sqlite3 db test.db
  expr 0
} 0
db eval {select * from collate3t1}
do_test collate3-3.1 {
  catchsql {
    INSERT INTO collate3t1 VALUES('xxx', 0);
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.2 {
  catchsql {
    UPDATE collate3t1 SET c1 = 'xxx';
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.3 {
  catchsql {
    UPDATE collate3t1 SET c2 = 'xxx';
  }
} {0 {}}
do_test collate3-3.4 {
  catchsql {
    DELETE FROM collate3t1 WHERE 1;
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.5 {
  catchsql {
    SELECT * FROM collate3t1;
  }
} {0 {xxx xxx}}
do_test collate3-3.6 {
  catchsql {
    DELETE FROM collate3t1;
  }
} {0 {}}
ifcapable {integrityck} {
  do_test collate3-3.8 {
    catchsql {
      PRAGMA integrity_check
    }
  } {1 {no such collation sequence: string_compare}}
}
do_test collate3-3.9 {
  catchsql {
    SELECT * FROM collate3t1;
  }
} {0 {}}
do_test collate3-3.10 {
  catchsql {
    SELECT * FROM collate3t1 ORDER BY 1 COLLATE string_compare;
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.11 {
  catchsql {
    SELECT * FROM collate3t1 ORDER BY c1;
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.12 {
  catchsql {
    SELECT * FROM collate3t1 WHERE c1 = 'xxx';
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.13 {
  catchsql {
    CREATE TABLE collate3t2(c1 COLLATE string_compare);
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.14 {
  catchsql {
    CREATE INDEX collate3t1_i2 ON collate3t1(c1);
  }
} {1 {no such collation sequence: string_compare}} 
do_test collate3-3.15 {
  execsql {
    DROP TABLE collate3t1;
  }
} {}

# Check we can create an index that uses an explicit collation 
# sequence and then close and re-open the database.
do_test collate3-4.6 {
  db collate user_defined "string compare"
  execsql {
    CREATE TABLE collate3t1(a, b);
    INSERT INTO collate3t1 VALUES('hello', NULL);
    CREATE INDEX collate3i1 ON collate3t1(a COLLATE user_defined);
  }
} {}
do_test collate3-4.7 {
  db close
  sqlite3 db test.db
  catchsql {
    SELECT * FROM collate3t1 ORDER BY a COLLATE user_defined;
  }
} {1 {no such collation sequence: user_defined}}
do_test collate3-4.8.1 {
  db collate user_defined "string compare"
  catchsql {
    SELECT * FROM collate3t1 ORDER BY a COLLATE user_defined;
  }
} {0 {hello {}}}
do_test collate3-4.8.2 {
  db close
  lindex [catch {
    sqlite3 db test.db
  }] 0
} {0}
do_test collate3-4.8.3 {
  execsql {
    DROP TABLE collate3t1;
  }
} {}

# Compare strings as numbers.
proc numeric_compare {lhs rhs} {
  if {$rhs > $lhs} {
    set res -1
  } else {
    set res [expr ($lhs > $rhs)?1:0]
  }
  return $res
}

# Check we can create a view that uses an explicit collation 
# sequence and then close and re-open the database.
ifcapable view {
do_test collate3-4.9 {
  db collate user_defined numeric_compare
  execsql {
    CREATE TABLE collate3t1(a, b);
    INSERT INTO collate3t1 VALUES('2', NULL);
    INSERT INTO collate3t1 VALUES('101', NULL);
    INSERT INTO collate3t1 VALUES('12', NULL);
    CREATE VIEW collate3v1 AS SELECT * FROM collate3t1 
        ORDER BY 1 COLLATE user_defined;
    SELECT * FROM collate3v1;
  }
} {2 {} 12 {} 101 {}}
do_test collate3-4.10 {
  db close
  sqlite3 db test.db
  catchsql {
    SELECT * FROM collate3v1;
  }
} {1 {no such collation sequence: user_defined}}
do_test collate3-4.11 {
  db collate user_defined numeric_compare
  catchsql {
    SELECT * FROM collate3v1;
  }
} {0 {2 {} 12 {} 101 {}}}
do_test collate3-4.12 {
  execsql {
    DROP TABLE collate3t1;
  }
} {}
} ;# ifcapable view

#
# Test the collation factory. In the code, the "no such collation sequence"
# message is only generated in two places. So these tests just test that
# the collation factory can be called once from each of those points.
#
do_test collate3-5.0 {
  catchsql {
    CREATE TABLE collate3t1(a);
    INSERT INTO collate3t1 VALUES(10);
    SELECT a FROM collate3t1 ORDER BY 1 COLLATE unk;
  }
} {1 {no such collation sequence: unk}}
do_test collate3-5.1 {
  set ::cfact_cnt 0
  proc cfact {nm} {
    db collate $nm {string compare}
    incr ::cfact_cnt
  }
  db collation_needed cfact
} {}
do_test collate3-5.2 {
  catchsql {
    SELECT a FROM collate3t1 ORDER BY 1 COLLATE unk;
  }
} {0 10}
do_test collate3-5.3 {
  set ::cfact_cnt
} {1}
do_test collate3-5.4 {
  catchsql {
    SELECT a FROM collate3t1 ORDER BY 1 COLLATE unk;
  }
} {0 10}
do_test collate3-5.5 {
  set ::cfact_cnt
} {1}
do_test collate3-5.6 {
  catchsql {
    SELECT a FROM collate3t1 ORDER BY 1 COLLATE unk;
  }
} {0 10}
do_test collate3-5.7 {
  execsql {
    DROP TABLE collate3t1;
    CREATE TABLE collate3t1(a COLLATE unk);
  }
  db close
  sqlite3 db test.db
  catchsql {
    SELECT a FROM collate3t1 ORDER BY 1;
  }
} {1 {no such collation sequence: unk}}
do_test collate3-5.8 {
  set ::cfact_cnt 0
  proc cfact {nm} {
    db collate $nm {string compare}
    incr ::cfact_cnt
  }
  db collation_needed cfact
  catchsql {
    SELECT a FROM collate3t1 ORDER BY 1;
  }
} {0 {}}

do_test collate3-5.9 {
  execsql {
    DROP TABLE collate3t1;
  }
} {}

finish_test
