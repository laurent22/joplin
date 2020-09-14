#
# 2007 November 12
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
# focus of this script is making sure that the names of collation
# sequences may be quoted using double quotes in SQL statements.
#
# $Id: collate9.test,v 1.2 2008/07/10 00:32:42 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc reverse_sort {lhs rhs} {
  return [string compare $rhs $lhs]
}
db collate "reverse sort" reverse_sort

# This procedure executes the SQL.  Then it checks to see if the OP_Sort
# opcode was executed.  If an OP_Sort did occur, then "sort" is appended
# to the result.  If no OP_Sort happened, then "nosort" is appended.
#
# This procedure is used to check to make sure sorting is or is not
# occurring as expected.
#
proc cksort {sql} {
  set ::sqlite_sort_count 0
  set data [execsql $sql]
  if {$::sqlite_sort_count} {set x sort} {set x nosort}
  lappend data $x
  return $data
}

# Test plan:
#
#     collate9-1.* - Test collation sequences attached to table columns
#     collate9-2.* - Test collation sequences attached to expressions
#     collate9-3.* - Test collation sequences attached to an index
#     collate9-4.* - Test collation sequences as an argument to REINDEX
#

do_test collate9-1.1 {
  execsql {
    CREATE TABLE xy(x COLLATE "reverse sort", y COLLATE binary);
    INSERT INTO xy VALUES('one', 'one');
    INSERT INTO xy VALUES('two', 'two');
    INSERT INTO xy VALUES('three', 'three');
  }
} {}
do_test collate9-1.2 {
  execsql { 
    SELECT x FROM xy ORDER BY x
  }
} {two three one}
do_test collate9-1.3 {
  execsql { 
    SELECT y FROM xy ORDER BY y
  }
} {one three two}
do_test collate9-1.4 {
  cksort { 
    SELECT x FROM xy ORDER BY x
  }
} {two three one sort}
do_test collate9-1.5 {
  execsql { 
    CREATE INDEX xy_i ON xy(x)
  }
} {}
do_test collate9-1.6 {
  cksort { 
    SELECT x FROM xy ORDER BY x
  }
} {two three one nosort}

do_test collate9-2.1 {
  execsql { 
    SELECT x, x < 'seven' FROM xy ORDER BY x
  }
} {two 1 three 1 one 0}
do_test collate9-2.2 {
  execsql { 
    SELECT y, y < 'seven' FROM xy ORDER BY x
  }
} {two 0 three 0 one 1}
do_test collate9-2.3 {
  execsql { 
    SELECT y, y COLLATE "reverse sort" < 'seven' FROM xy ORDER BY x
  }
} {two 1 three 1 one 0}
do_test collate9-2.4 {
  execsql {
    SELECT y FROM xy ORDER BY y
  }
} {one three two}
do_test collate9-2.5 {
  execsql {
    SELECT y FROM xy ORDER BY y COLLATE "reverse sort"
  }
} {two three one}
do_test collate9-2.6 {
  execsql {
    SELECT y COLLATE "reverse sort" AS aaa FROM xy ORDER BY aaa
  }
} {two three one}

do_test collate9-3.1 {
  execsql {
    CREATE INDEX xy_i2 ON xy(y COLLATE "reverse sort");
  }
} {}
do_test collate9-3.2 {
  cksort { 
    SELECT y FROM xy ORDER BY y 
  }
} {one three two sort}
do_test collate9-3.3 {
  cksort { 
    SELECT y FROM xy ORDER BY y COLLATE "reverse sort"
  }
} {two three one nosort}
do_test collate9-3.4 {
  cksort { 
    SELECT y AS aaa FROM xy ORDER BY aaa
  }
} {one three two sort}
do_test collate9-3.5 {
  cksort { 
    SELECT y COLLATE "reverse sort" AS aaa FROM xy ORDER BY aaa
  }
} {two three one nosort}

ifcapable reindex {
  do_test collate9-4.1 {
    execsql {
      REINDEX "reverse sort"
    }
  } {}

  # Modify the "reverse sort" collation so that it now sorts in the same
  # order as binary.
  proc reverse_sort {lhs rhs} {
    return [string compare $lhs $rhs]
  }

  # The integrity check should now fail because the indexes created using
  # "reverse sort" are no longer in sync with the collation sequence
  # implementation.
  do_test collate9-4.2 {
    expr {"ok" eq [execsql { PRAGMA integrity_check }]}
  } {0}

  do_test collate9-4.3 {
    execsql {
      REINDEX "reverse sort"
    }
  } {}

  # Integrity check should now pass.
  do_test collate9-4.4 {
    expr {"ok" eq [execsql { PRAGMA integrity_check }]}
  } {1}

  do_test collate9-4.5 {
    cksort {
      SELECT x FROM xy ORDER BY x COLLATE "reverse sort"
    }
  } {one three two nosort}
}

finish_test
