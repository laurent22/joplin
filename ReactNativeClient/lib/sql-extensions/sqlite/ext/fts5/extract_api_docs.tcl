#
# 2014 August 24
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#--------------------------------------------------------------------------
#
# This script extracts the documentation for the API used by fts5 auxiliary 
# functions from header file fts5.h. It outputs html text on stdout that
# is included in the documentation on the web.
# 

set ::fts5_docs_output ""
if {[info commands hd_putsnl]==""} {
  if {[llength $argv]>0} { set ::extract_api_docs_mode [lindex $argv 0] }
  proc output {text} {
    puts $text
  }
} else {
  proc output {text} {
    append ::fts5_docs_output "$text\n"
  }
}
if {[info exists ::extract_api_docs_mode]==0} {set ::extract_api_docs_mode api}


set input_file [file join [file dir [info script]] fts5.h]
set fd [open $input_file]
set data [read $fd]
close $fd


# Argument $data is the entire text of the fts5.h file. This function 
# extracts the definition of the Fts5ExtensionApi structure from it and
# returns a key/value list of structure member names and definitions. i.e.
#
#   iVersion {int iVersion} xUserData {void *(*xUserData)(Fts5Context*)} ...
#
proc get_struct_members {data} {

  # Extract the structure definition from the fts5.h file.
  regexp "struct Fts5ExtensionApi {(.*?)};" $data -> defn

  # Remove all comments from the structure definition
  regsub -all {/[*].*?[*]/} $defn {} defn2

  set res [list]
  foreach member [split $defn2 {;}] {

    set member [string trim $member]
    if {$member!=""} { 
      catch { set name [lindex $member end] }
      regexp {.*?[(][*]([^)]*)[)]} $member -> name
      lappend res $name $member
    }
  }

  set res
}

proc get_struct_docs {data names} {
  # Extract the structure definition from the fts5.h file.
  regexp {EXTENSION API FUNCTIONS(.*?)[*]/} $data -> docs

  set current_doc    ""
  set current_header ""

  foreach line [split $docs "\n"] {
    regsub {[*]*} $line {} line
    if {[regexp {^  } $line]} {
      append current_doc "$line\n"
    } elseif {[string trim $line]==""} {
      if {$current_header!=""} { append current_doc "\n" }
    } else {
      if {$current_doc != ""} {
        lappend res $current_header $current_doc
        set current_doc ""
      }
      set subject n/a
      regexp {^ *([[:alpha:]]*)} $line -> subject
      if {[lsearch $names $subject]>=0} {
        set current_header $subject
      } else {
        set current_header [string trim $line]
      }
    }
  }

  if {$current_doc != ""} {
    lappend res $current_header $current_doc
  }

  set res
}

proc get_tokenizer_docs {data} {
  regexp {(xCreate:.*?)[*]/} $data -> docs

  set res "<dl>\n"
  foreach line [split [string trim $docs] "\n"] {
    regexp {[*][*](.*)} $line -> line
    if {[regexp {^ ?x.*:} $line]} {
      append res "<dt><b>$line</b></dt><dd><p style=margin-top:0>\n"
      continue
    }
    if {[regexp {SYNONYM SUPPORT} $line]} {
      set line "</dl><h3>Synonym Support</h3>"
    }
    if {[string trim $line] == ""} {
      append res "<p>\n"
    } else {
      append res "$line\n"
    }
  }

  set res
}

proc get_api_docs {data} {
  # Initialize global array M as a map from Fts5StructureApi member name
  # to member definition. i.e.
  #
  #   iVersion  -> {int iVersion}
  #   xUserData -> {void *(*xUserData)(Fts5Context*)}
  #   ...
  #
  array set M [get_struct_members $data]
  
  # Initialize global list D as a map from section name to documentation
  # text. Most (all?) section names are structure member names.
  #
  set D [get_struct_docs $data [array names M]]
  
  output "<dl>"
  foreach {sub docs} $D {
    if {[info exists M($sub)]} {
      set hdr $M($sub)
      set link " id=$sub"
    } else {
      set link ""
    }

    #output "<hr color=#eeeee style=\"margin:1em 8.4ex 0 8.4ex;\"$link>"
    #set style "padding-left:6ex;font-size:1.4em;display:block"
    #output "<h style=\"$style\"><pre>$hdr</pre></h>"

    regsub -line {^  *[)]} $hdr ")" hdr
    output "<dt style=\"white-space:pre;font-family:monospace;font-size:120%\""
    output "$link>"
    output "<b>$hdr</b></dt><dd>"
  
    set mode ""
    set margin " style=margin-top:0.1em"
    foreach line [split [string trim $docs] "\n"] {
      if {[string trim $line]==""} {
        if {$mode != ""} {output "</$mode>"}
        set mode ""
      } elseif {$mode == ""} {
        if {[regexp {^     } $line]} {
          set mode codeblock
        } else {
          set mode p
        }
        output "<$mode$margin>"
        set margin ""
      }
      output $line
    }
    if {$mode != ""} {output "</$mode>"}
    output "</dd>"
  }
  output "</dl>"
}

proc get_fts5_struct {data start end} {
  set res ""
  set bOut 0
  foreach line [split $data "\n"] {
    if {$bOut==0} {
      if {[regexp $start $line]} {
        set bOut 1
      }
    }

    if {$bOut} {
      append res "$line\n"
    }

    if {$bOut} {
      if {[regexp $end $line]} {
        set bOut 0
      }
    }
  }

  set map [list /* <i>/* */ */</i>]
  string map $map $res
}

proc main {data} {
  switch $::extract_api_docs_mode {
    fts5_api {
      output [get_fts5_struct $data "typedef struct fts5_api" "^\};"]
    }

    fts5_tokenizer {
      output [get_fts5_struct $data "typedef struct Fts5Tokenizer" "^\};"]
      output [get_fts5_struct $data \
        "Flags that may be passed as the third argument to xTokenize()" \
        "#define FTS5_TOKEN_COLOCATED"
      ]
    }

    fts5_extension {
      output [get_fts5_struct $data "typedef.*Fts5ExtensionApi" "^.;"]
    }

    Fts5ExtensionApi {
      set struct [get_fts5_struct $data "^struct Fts5ExtensionApi" "^.;"]
      set map [list]
      foreach {k v} [get_struct_members $data] {
        if {[string match x* $k]==0} continue
        lappend map $k "<a href=#$k>$k</a>"
      }
      output [string map $map $struct]
    }

    api {
      get_api_docs $data
    }

    tokenizer_api {
      output [get_tokenizer_docs $data]
    }

    default {
    }
  }
}
main $data

set ::fts5_docs_output





