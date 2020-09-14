


#-------------------------------------------------------------------------
# Process command line arguments.
#
proc usage {} {
  puts stderr "usage: $::argv0 ?OPTIONS? database table"
  puts stderr ""
  puts stderr "  -nterm                (count number of terms in each segment)"
  puts stderr "  -segments             (output segment contents)"
  puts stderr ""
  exit 1
}

set O(nterm) 0
set O(segments) 0

if {[llength $argv]<2} usage
foreach a [lrange $argv 0 end-2] {
  switch -- $a {
    -nterm {
      set O(nterm) 1
    }

    -segments {
      set O(segments) 1
    }

    default {
      usage
    }
  }
}

set database [lindex $argv end-1]
set tbl [lindex $argv end]


#-------------------------------------------------------------------------
# Count the number of terms in each segment of fts5 table $tbl. Store the
# counts in the array variable in the parent context named by parameter
# $arrayname, indexed by segment-id. Example:
#
#   count_terms fts_tbl A
#   foreach {k v} [array get A] { puts "segid=$k nTerm=$v" }
#
proc count_terms {tbl arrayname} {
  upvar A $arrayname
  array unset A
  db eval "SELECT fts5_decode(rowid, block) AS d FROM ${tbl}_data" {
    set desc [lindex $d 0]
    if {[regexp {^segid=([0-9]*)} $desc -> id]} {
      foreach i [lrange $d 1 end] {
        if {[string match {term=*} $i]} { incr A($id) }
      }
    }
  }
}


#-------------------------------------------------------------------------
# Start of main program.
#
sqlite3 db $database
catch { load_static_extension db fts5 }

if {$O(nterm)} { count_terms $tbl A }

db eval "SELECT fts5_decode(rowid, block) AS d FROM ${tbl}_data WHERE id=10" {
  foreach lvl [lrange $d 1 end] {
    puts [lrange $lvl 0 2]

    foreach seg [lrange $lvl 3 end] {
      if {$::O(nterm)} {
        regexp {^id=([0-9]*)} $seg -> id
        set nTerm 0
        catch { set nTerm $A($id) }
        puts [format "        % -28s    nTerm=%d" $seg $nTerm]
      } else {
        puts [format "        % -28s" $seg]
      }
    }
  }
}

if {$O(segments)} {
  puts ""
  db eval "SELECT fts5_decode(rowid, block) AS d FROM ${tbl}_data WHERE id>10" {
    puts $d
  }
}





