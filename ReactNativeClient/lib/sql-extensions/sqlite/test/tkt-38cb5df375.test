# 2010 October 6
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [38cb5df375078d3f9711482d2a1615d09f6b3f33] has
# been resolved.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

do_test tkt-38cb5df375.0 {
  execsql {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 SELECT a+2 FROM t1;
    INSERT INTO t1 SELECT a+4 FROM t1;
  }
} {}

foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.1.$ii {
    execsql {
      SELECT * FROM (SELECT * FROM t1 ORDER BY a)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1)
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 5 6 7 8 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.2.$ii {
    execsql {
      SELECT 9 FROM (SELECT * FROM t1)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a)
      LIMIT $::ii;
    }
  } [lrange {9 9 9 9 9 9 9 9 1 2 3 4 5 6 7 8} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.3.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a)
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 5 6 7 8 1 2 3 4 5 6 7 8} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.4.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1)
      LIMIT $::ii;
    }
  } [lrange {0 0 0 0 0 0 0 0 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4} {
  do_test tkt-38cb5df375.5.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1)
      UNION SELECT 9 FROM (SELECT a FROM t1)
      LIMIT $::ii;
    }
  } [lrange {0 9} 0 [expr {$ii-1}]]
}

foreach ii {1 2 3 4 5 6 7 8 9 10 11} {
  do_test tkt-38cb5df375.11.$ii {
    execsql {
      SELECT * FROM (SELECT * FROM t1 ORDER BY a LIMIT 3)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1)
      LIMIT $::ii;
    }
  } [lrange {1 2 3 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11} {
  do_test tkt-38cb5df375.12.$ii {
    execsql {
      SELECT 9 FROM (SELECT * FROM t1)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 3)
      LIMIT $::ii;
    }
  } [lrange {9 9 9 9 9 9 9 9 1 2 3} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6} {
  do_test tkt-38cb5df375.13.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 3)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 3)
      LIMIT $::ii;
    }
  } [lrange {1 2 3 1 2 3} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6} {
  do_test tkt-38cb5df375.14.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1 LIMIT 3)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1 LIMIT 3)
      LIMIT $::ii;
    }
  } [lrange {0 0 0 9 9 9} 0 [expr {$ii-1}]]
}

foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.21.$ii {
    execsql {
      SELECT * FROM (SELECT * FROM t1 ORDER BY a)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 5 6 7 8 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.22.$ii {
    execsql {
      SELECT 9 FROM (SELECT * FROM t1)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 5 6 7 8 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.23.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a)
      ORDER BY 1 DESC
      LIMIT $::ii;
    }
  } [lrange {8 8 7 7 6 6 5 5 4 4 3 3 2 2 1 1} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16} {
  do_test tkt-38cb5df375.24.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {0 0 0 0 0 0 0 0 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}

foreach ii {1 2 3 4 5 6 7 8 9 10 11} {
  do_test tkt-38cb5df375.31.$ii {
    execsql {
      SELECT * FROM (SELECT * FROM t1 ORDER BY a LIMIT 3)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9 10 11} {
  do_test tkt-38cb5df375.32.$ii {
    execsql {
      SELECT 9 FROM (SELECT * FROM t1)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 3)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 9 9 9 9 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.33.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 4)
      UNION ALL SELECT 90+a FROM (SELECT a FROM t1 ORDER BY a LIMIT 3)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 91 92 93} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.34.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 2)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 5)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 1 2 2 3 4 5} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.35.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 5)
      UNION ALL SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 1 2 2 3 4 5} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.35b.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 5)
      UNION ALL SELECT a+10 FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 5 11 12} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.35c.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 5)
      UNION SELECT a+10 FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 4 5 11 12} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.35d.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 5)
      INTERSECT SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.35e.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 5)
      EXCEPT SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {3 4 5} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.36.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1 LIMIT 3)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1 LIMIT 4)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {0 0 0 9 9 9 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.37.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1 LIMIT 3)
      UNION SELECT 9 FROM (SELECT a FROM t1 LIMIT 4)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {0 9} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7} {
  do_test tkt-38cb5df375.38.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1 LIMIT 3)
      EXCEPT SELECT 9 FROM (SELECT a FROM t1 LIMIT 4)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {0} 0 [expr {$ii-1}]]
}

foreach ii {1 2 3 4 5 6 7 8 9} {
  do_test tkt-38cb5df375.41.$ii {
    execsql {
      SELECT 0 FROM (SELECT * FROM t1 LIMIT 3)
      UNION ALL SELECT 9 FROM (SELECT a FROM t1 LIMIT 4)
      UNION ALL SELECT 88 FROM (SELECT a FROM t1 LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {0 0 0 9 9 9 9 88 88} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9} {
  do_test tkt-38cb5df375.42.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 3)
      UNION ALL SELECT a+10 FROM (SELECT a FROM t1 ORDER BY a LIMIT 4)
      UNION ALL SELECT a+20 FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 11 12 13 14 21 22} 0 [expr {$ii-1}]]
}
foreach ii {1 2 3 4 5 6 7 8 9} {
  do_test tkt-38cb5df375.43.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a LIMIT 3)
      UNION SELECT a+10 FROM (SELECT a FROM t1 ORDER BY a LIMIT 4)
      UNION SELECT a+20 FROM (SELECT a FROM t1 ORDER BY a LIMIT 2)
      ORDER BY 1
      LIMIT $::ii;
    }
  } [lrange {1 2 3 11 12 13 14 21 22} 0 [expr {$ii-1}]]
}

foreach ii {1 2 3 4 5 6 7} {
  set jj [expr {7-$ii}]
  do_test tkt-38cb5df375.51.$ii {
    execsql {
      SELECT a FROM (SELECT * FROM t1 ORDER BY a)
      EXCEPT SELECT a FROM (SELECT a FROM t1 ORDER BY a LIMIT $::ii)
      ORDER BY a DESC
      LIMIT $::jj;
    }
  } [lrange {8 7 6 5 4 3 2 1} 0 [expr {$jj-1}]]
}


finish_test
