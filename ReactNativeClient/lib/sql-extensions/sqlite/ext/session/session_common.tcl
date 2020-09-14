
proc do_changeset_test {tn session res} {
  set r [list]
  foreach x $res {lappend r $x}
  uplevel do_test $tn [list [subst -nocommands {
    set x [list]
    sqlite3session_foreach c [$session changeset] { lappend x [set c] }
    set x
  }]] [list $r]
}

proc do_patchset_test {tn session res} {
  set r [list]
  foreach x $res {lappend r $x}
  uplevel do_test $tn [list [subst -nocommands {
    set x [list]
    sqlite3session_foreach c [$session patchset] { lappend x [set c] }
    set x
  }]] [list $r]
}


proc do_changeset_invert_test {tn session res} {
  set r [list]
  foreach x $res {lappend r $x}
  uplevel do_test $tn [list [subst -nocommands {
    set x [list]
    set changeset [sqlite3changeset_invert [$session changeset]]
    sqlite3session_foreach c [set changeset] { lappend x [set c] }
    set x
  }]] [list $r]
}


proc do_conflict_test {tn args} {

  set O(-tables)    [list]
  set O(-sql)       [list]
  set O(-conflicts) [list]
  set O(-policy)    "OMIT"

  array set V $args
  foreach key [array names V] {
    if {![info exists O($key)]} {error "no such option: $key"}
  }
  array set O $args

  proc xConflict {args} [subst -nocommands { 
    lappend ::xConflict [set args]
    return $O(-policy) 
  }]
  proc bgerror {args} { set ::background_error $args }

  sqlite3session S db main
  foreach t $O(-tables) { S attach $t }
  execsql $O(-sql)

  set ::xConflict [list]
  sqlite3changeset_apply db2 [S changeset] xConflict

  set conflicts [list]
  foreach c $O(-conflicts) {
    lappend conflicts $c
  }

  after 1 {set go 1}
  vwait go

  uplevel do_test $tn [list { set ::xConflict }] [list $conflicts]
  S delete
}

proc do_common_sql {sql} {
  execsql $sql db
  execsql $sql db2
}

proc changeset_from_sql {sql {dbname main}} {
  if {$dbname == "main"} {
    return [sql_exec_changeset db $sql]
  }
  set rc [catch {
    sqlite3session S db $dbname
    db eval "SELECT name FROM $dbname.sqlite_master WHERE type = 'table'" {
      S attach $name
    }
    db eval $sql
    S changeset
  } changeset]
  catch { S delete }

  if {$rc} {
    error $changeset
  }
  return $changeset
}

proc patchset_from_sql {sql {dbname main}} {
  set rc [catch {
    sqlite3session S db $dbname
    db eval "SELECT name FROM $dbname.sqlite_master WHERE type = 'table'" {
      S attach $name
    }
    db eval $sql
    S patchset
  } patchset]
  catch { S delete }

  if {$rc} {
    error $patchset
  }
  return $patchset
}

proc do_then_apply_sql {sql {dbname main}} {
  proc xConflict args { return "OMIT" }
  set rc [catch {
    sqlite3session S db $dbname
    db eval "SELECT name FROM $dbname.sqlite_master WHERE type = 'table'" {
      S attach $name
    }
    db eval $sql
    sqlite3changeset_apply db2 [S changeset] xConflict
  } msg]

  catch { S delete }

  if {$rc} {error $msg}
}

proc do_iterator_test {tn tbl_list sql res} {
  sqlite3session S db main
  if {[llength $tbl_list]==0} { S attach * }
  foreach t $tbl_list {S attach $t}

  execsql $sql

  set r [list]
  foreach v $res { lappend r $v }

  set x [list]
  sqlite3session_foreach c [S changeset] { lappend x $c }
  uplevel do_test $tn [list [list set {} $x]] [list $r]

  S delete
}

# Compare the contents of all tables in [db1] and [db2]. Throw an error if 
# they are not identical, or return an empty string if they are.
#
proc compare_db {db1 db2} {

  set sql {SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name}
  set lot1 [$db1 eval $sql]
  set lot2 [$db2 eval $sql]

  if {$lot1 != $lot2} { 
    puts $lot1
    puts $lot2
    error "databases contain different tables" 
  }

  foreach tbl $lot1 {
    set col1 [list]
    set col2 [list]

    $db1 eval "PRAGMA table_info = $tbl" { lappend col1 $name }
    $db2 eval "PRAGMA table_info = $tbl" { lappend col2 $name }
    if {$col1 != $col2} { error "table $tbl schema mismatch" }

    set sql "SELECT * FROM $tbl ORDER BY [join $col1 ,]"
    set data1 [$db1 eval $sql]
    set data2 [$db2 eval $sql]
    if {$data1 != $data2} { 
      puts "$db1: $data1"
      puts "$db2: $data2"
      error "table $tbl data mismatch" 
    }
  }

  return ""
}

proc changeset_to_list {c} {
  set list [list]
  sqlite3session_foreach elem $c { lappend list $elem }
  lsort $list
}

set ones {zero one two three four five six seven eight nine
          ten eleven twelve thirteen fourteen fifteen sixteen seventeen
          eighteen nineteen}
set tens {{} ten twenty thirty forty fifty sixty seventy eighty ninety}
proc number_name {n} {
  if {$n>=1000} {
    set txt "[number_name [expr {$n/1000}]] thousand"
    set n [expr {$n%1000}]
  } else {
    set txt {}
  }
  if {$n>=100} {
    append txt " [lindex $::ones [expr {$n/100}]] hundred"
    set n [expr {$n%100}]
  }
  if {$n>=20} {
    append txt " [lindex $::tens [expr {$n/10}]]"
    set n [expr {$n%10}]
  }
  if {$n>0} {
    append txt " [lindex $::ones $n]"
  }
  set txt [string trim $txt]
  if {$txt==""} {set txt zero}
  return $txt
}
