# Copyright (c) 2017 D. Richard Hipp
# 
# This program is free software; you can redistribute it and/or
# modify it under the terms of the Simplified BSD License (also
# known as the "2-Clause License" or "FreeBSD License".)
#
# This program is distributed in the hope that it will be useful,
# but without any warranty; without even the implied warranty of
# merchantability or fitness for a particular purpose.
#
#---------------------------------------------------------------------------
#
# Design rules:
#
#   (1)  All identifiers in the global namespace begin with "wapp"
#
#   (2)  Indentifiers intended for internal use only begin with "wappInt"
#
package require Tcl 8.6

# Add text to the end of the HTTP reply.  No interpretation or transformation
# of the text is performs.  The argument should be enclosed within {...}
#
proc wapp {txt} {
  global wapp
  dict append wapp .reply $txt
}

# Add text to the page under construction.  Do no escaping on the text.
#
# Though "unsafe" in general, there are uses for this kind of thing.
# For example, if you want to return the complete, unmodified content of
# a file:
#
#         set fd [open content.html rb]
#         wapp-unsafe [read $fd]
#         close $fd
#
# You could do the same thing using ordinary "wapp" instead of "wapp-unsafe".
# The difference is that wapp-safety-check will complain about the misuse
# of "wapp", but it assumes that the person who write "wapp-unsafe" understands
# the risks.
#
# Though occasionally necessary, the use of this interface should be minimized.
#
proc wapp-unsafe {txt} {
  global wapp
  dict append wapp .reply $txt
}

# Add text to the end of the reply under construction.  The following
# substitutions are made:
#
#     %html(...)          Escape text for inclusion in HTML
#     %url(...)           Escape text for use as a URL
#     %qp(...)            Escape text for use as a URI query parameter
#     %string(...)        Escape text for use within a JSON string
#     %unsafe(...)        No transformations of the text
#
# The substitutions above terminate at the first ")" character.  If the
# text of the TCL string in ... contains ")" characters itself, use instead:
#
#     %html%(...)%
#     %url%(...)%
#     %qp%(...)%
#     %string%(...)%
#     %unsafe%(...)%
#
# In other words, use "%(...)%" instead of "(...)" to include the TCL string
# to substitute.
#
# The %unsafe substitution should be avoided whenever possible, obviously.
# In addition to the substitutions above, the text also does backslash
# escapes.
#
# The wapp-trim proc works the same as wapp-subst except that it also removes
# whitespace from the left margin, so that the generated HTML/CSS/Javascript
# does not appear to be indented when delivered to the client web browser.
#
if {$tcl_version>=8.7} {
  proc wapp-subst {txt} {
    global wapp
    regsub -all -command \
       {%(html|url|qp|string|unsafe){1,1}?(|%)\((.+)\)\2} $txt wappInt-enc txt
    dict append wapp .reply [subst -novariables -nocommand $txt]
  }
  proc wapp-trim {txt} {
    global wapp
    regsub -all {\n\s+} [string trim $txt] \n txt
    regsub -all -command \
       {%(html|url|qp|string|unsafe){1,1}?(|%)\((.+)\)\2} $txt wappInt-enc txt
    dict append wapp .reply [subst -novariables -nocommand $txt]
  }
  proc wappInt-enc {all mode nu1 txt} {
    return [uplevel 2 "wappInt-enc-$mode \"$txt\""]
  }
} else {
  proc wapp-subst {txt} {
    global wapp
    regsub -all {%(html|url|qp|string|unsafe){1,1}?(|%)\((.+)\)\2} $txt \
           {[wappInt-enc-\1 "\3"]} txt
    dict append wapp .reply [uplevel 1 [list subst -novariables $txt]]
  }
  proc wapp-trim {txt} {
    global wapp
    regsub -all {\n\s+} [string trim $txt] \n txt
    regsub -all {%(html|url|qp|string|unsafe){1,1}?(|%)\((.+)\)\2} $txt \
           {[wappInt-enc-\1 "\3"]} txt
    dict append wapp .reply [uplevel 1 [list subst -novariables $txt]]
  }
}

# There must be a wappInt-enc-NAME routine for each possible substitution
# in wapp-subst.  Thus there are routines for "html", "url", "qp", and "unsafe".
#
#    wappInt-enc-html           Escape text so that it is safe to use in the
#                               body of an HTML document.
#
#    wappInt-enc-url            Escape text so that it is safe to pass as an
#                               argument to href= and src= attributes in HTML.
#
#    wappInt-enc-qp             Escape text so that it is safe to use as the
#                               value of a query parameter in a URL or in
#                               post data or in a cookie.
#
#    wappInt-enc-string         Escape ", ', \, and < for using inside of a
#                               javascript string literal.  The < character
#                               is escaped to prevent "</script>" from causing
#                               problems in embedded javascript.
#
#    wappInt-enc-unsafe         Perform no encoding at all.  Unsafe.
#
proc wappInt-enc-html {txt} {
  return [string map {& &amp; < &lt; > &gt; \" &quot; \\ &#92;} $txt]
}
proc wappInt-enc-unsafe {txt} {
  return $txt
}
proc wappInt-enc-url {s} {
  if {[regsub -all {[^-{}@~?=#_.:/a-zA-Z0-9]} $s {[wappInt-%HHchar {&}]} s]} {
    set s [subst -novar -noback $s]
  }
  if {[regsub -all {[{}]} $s {[wappInt-%HHchar \\&]} s]} {
    set s [subst -novar -noback $s]
  }
  return $s
}
proc wappInt-enc-qp {s} {
  if {[regsub -all {[^-{}_.a-zA-Z0-9]} $s {[wappInt-%HHchar {&}]} s]} {
    set s [subst -novar -noback $s]
  }
  if {[regsub -all {[{}]} $s {[wappInt-%HHchar \\&]} s]} {
    set s [subst -novar -noback $s]
  }
  return $s
}
proc wappInt-enc-string {s} {
  return [string map {\\ \\\\ \" \\\" ' \\' < \\u003c} $s]
}

# This is a helper routine for wappInt-enc-url and wappInt-enc-qp.  It returns
# an appropriate %HH encoding for the single character c.  If c is a unicode
# character, then this routine might return multiple bytes:  %HH%HH%HH
#
proc wappInt-%HHchar {c} {
  if {$c==" "} {return +}
  return [regsub -all .. [binary encode hex [encoding convertto utf-8 $c]] {%&}]
}


# Undo the www-url-encoded format.
#
# HT: This code stolen from ncgi.tcl
#
proc wappInt-decode-url {str} {
  set str [string map [list + { } "\\" "\\\\" \[ \\\[ \] \\\]] $str]
  regsub -all -- \
      {%([Ee][A-Fa-f0-9])%([89ABab][A-Fa-f0-9])%([89ABab][A-Fa-f0-9])} \
      $str {[encoding convertfrom utf-8 [binary decode hex \1\2\3]]} str
  regsub -all -- \
      {%([CDcd][A-Fa-f0-9])%([89ABab][A-Fa-f0-9])}                     \
      $str {[encoding convertfrom utf-8 [binary decode hex \1\2]]} str
  regsub -all -- {%([0-7][A-Fa-f0-9])} $str {\\u00\1} str
  return [subst -novar $str]
}

# Reset the document back to an empty string.
#
proc wapp-reset {} {
  global wapp
  dict set wapp .reply {}
}

# Change the mime-type of the result document.
#
proc wapp-mimetype {x} {
  global wapp
  dict set wapp .mimetype $x
}

# Change the reply code.
#
proc wapp-reply-code {x} {
  global wapp
  dict set wapp .reply-code $x
}

# Set a cookie
#
proc wapp-set-cookie {name value} {
  global wapp
  dict lappend wapp .new-cookies $name $value
}

# Unset a cookie
#
proc wapp-clear-cookie {name} {
  wapp-set-cookie $name {}
}

# Add extra entries to the reply header
#
proc wapp-reply-extra {name value} {
  global wapp
  dict lappend wapp .reply-extra $name $value
}

# Specifies how the web-page under construction should be cached.
# The argument should be one of:
#
#    no-cache
#    max-age=N             (for some integer number of seconds, N)
#    private,max-age=N
#
proc wapp-cache-control {x} {
  wapp-reply-extra Cache-Control $x
}

# Redirect to a different web page
#
proc wapp-redirect {uri} {
  wapp-reply-code {307 Redirect}
  wapp-reply-extra Location $uri
}

# Return the value of a wapp parameter
#
proc wapp-param {name {dflt {}}} {
  global wapp
  if {![dict exists $wapp $name]} {return $dflt}
  return [dict get $wapp $name]
}

# Return true if a and only if the wapp parameter $name exists
#
proc wapp-param-exists {name} {
  global wapp
  return [dict exists $wapp $name]
}

# Set the value of a wapp parameter
#
proc wapp-set-param {name value} {
  global wapp
  dict set wapp $name $value
}

# Return all parameter names that match the GLOB pattern, or all
# names if the GLOB pattern is omitted.
#
proc wapp-param-list {{glob {*}}} {
  global wapp
  return [dict keys $wapp $glob]
}

# By default, Wapp does not decode query parameters and POST parameters
# for cross-origin requests.  This is a security restriction, designed to
# help prevent cross-site request forgery (CSRF) attacks.
#
# As a consequence of this restriction, URLs for sites generated by Wapp
# that contain query parameters will not work as URLs found in other
# websites.  You cannot create a link from a second website into a Wapp
# website if the link contains query planner, by default.
#
# Of course, it is sometimes desirable to allow query parameters on external
# links.  For URLs for which this is safe, the application should invoke
# wapp-allow-xorigin-params.  This procedure tells Wapp that it is safe to
# go ahead and decode the query parameters even for cross-site requests.
#
# In other words, for Wapp security is the default setting.  Individual pages
# need to actively disable the cross-site request security if those pages
# are safe for cross-site access.
#
proc wapp-allow-xorigin-params {} {
  global wapp
  if {![dict exists $wapp .qp] && ![dict get $wapp SAME_ORIGIN]} {
    wappInt-decode-query-params
  }
}

# Set the content-security-policy.
#
# The default content-security-policy is very strict:  "default-src 'self'"
# The default policy prohibits the use of in-line javascript or CSS.
#
# Provide an alternative CSP as the argument.  Or use "off" to disable
# the CSP completely.
#
proc wapp-content-security-policy {val} {
  global wapp
  if {$val=="off"} {
    dict unset wapp .csp
  } else {
    dict set wapp .csp $val
  }
}

# Examine the bodys of all procedures in this program looking for
# unsafe calls to various Wapp interfaces.  Return a text string
# containing warnings. Return an empty string if all is ok.
#
# This routine is advisory only.  It misses some constructs that are
# dangerous and flags others that are safe.
#
proc wapp-safety-check {} {
  set res {}
  foreach p [info procs] {
    set ln 0
    foreach x [split [info body $p] \n] {
      incr ln
      if {[regexp {^[ \t]*wapp[ \t]+([^\n]+)} $x all tail]
       && [string index $tail 0]!="\173"
       && [regexp {[[$]} $tail]
      } {
        append res "$p:$ln: unsafe \"wapp\" call: \"[string trim $x]\"\n"
      }
      if {[regexp {^[ \t]*wapp-(subst|trim)[ \t]+[^\173]} $x all cx]} {
        append res "$p:$ln: unsafe \"wapp-$cx\" call: \"[string trim $x]\"\n"
      }
    }
  }
  return $res
}

# Return a string that descripts the current environment.  Applications
# might find this useful for debugging.
#
proc wapp-debug-env {} {
  global wapp
  set out {}
  foreach var [lsort [dict keys $wapp]] {
    if {[string index $var 0]=="."} continue
    append out "$var = [list [dict get $wapp $var]]\n"
  }
  append out "\[pwd\] = [list [pwd]]\n"
  return $out
}

# Tracing function for each HTTP request.  This is overridden by wapp-start
# if tracing is enabled.
#
proc wappInt-trace {} {}

# Start up a listening socket.  Arrange to invoke wappInt-new-connection
# for each inbound HTTP connection.
#
#    port            Listen on this TCP port.  0 means to select a port
#                    that is not currently in use
#
#    wappmode        One of "scgi", "remote-scgi", "server", or "local".
#
#    fromip          If not {}, then reject all requests from IP addresses
#                    other than $fromip
#
proc wappInt-start-listener {port wappmode fromip} {
  if {[string match *scgi $wappmode]} {
    set type SCGI
    set server [list wappInt-new-connection \
                wappInt-scgi-readable $wappmode $fromip]
  } else {
    set type HTTP
    set server [list wappInt-new-connection \
                wappInt-http-readable $wappmode $fromip]
  }
  if {$wappmode=="local" || $wappmode=="scgi"} {
    set x [socket -server $server -myaddr 127.0.0.1 $port]
  } else {
    set x [socket -server $server $port]
  }
  set coninfo [chan configure $x -sockname]
  set port [lindex $coninfo 2]
  if {$wappmode=="local"} {
    wappInt-start-browser http://127.0.0.1:$port/
  } elseif {$fromip!=""} {
    puts "Listening for $type requests on TCP port $port from IP $fromip"
  } else {
    puts "Listening for $type requests on TCP port $port"
  }
}

# Start a web-browser and point it at $URL
#
proc wappInt-start-browser {url} {
  global tcl_platform
  if {$tcl_platform(platform)=="windows"} {
    exec cmd /c start $url &
  } elseif {$tcl_platform(os)=="Darwin"} {
    exec open $url &
  } elseif {[catch {exec xdg-open $url}]} {
    exec firefox $url &
  }
}

# This routine is a "socket -server" callback.  The $chan, $ip, and $port
# arguments are added by the socket command.
#
# Arrange to invoke $callback when content is available on the new socket.
# The $callback will process inbound HTTP or SCGI content.  Reject the
# request if $fromip is not an empty string and does not match $ip.
#
proc wappInt-new-connection {callback wappmode fromip chan ip port} {
  upvar #0 wappInt-$chan W
  if {$fromip!="" && ![string match $fromip $ip]} {
    close $chan
    return
  }
  set W [dict create REMOTE_ADDR $ip REMOTE_PORT $port WAPP_MODE $wappmode \
         .header {}]
  fconfigure $chan -blocking 0 -translation binary
  fileevent $chan readable [list $callback $chan]
}

# Close an input channel
#
proc wappInt-close-channel {chan} {
  if {$chan=="stdout"} {
    # This happens after completing a CGI request
    exit 0
  } else {
    unset ::wappInt-$chan
    close $chan
  }
}

# Process new text received on an inbound HTTP request
#
proc wappInt-http-readable {chan} {
  if {[catch [list wappInt-http-readable-unsafe $chan] msg]} {
    puts stderr "$msg\n$::errorInfo"
    wappInt-close-channel $chan
  }
}
proc wappInt-http-readable-unsafe {chan} {
  upvar #0 wappInt-$chan W wapp wapp
  if {![dict exists $W .toread]} {
    # If the .toread key is not set, that means we are still reading
    # the header
    set line [string trimright [gets $chan]]
    set n [string length $line]
    if {$n>0} {
      if {[dict get $W .header]=="" || [regexp {^\s+} $line]} {
        dict append W .header $line
      } else {
        dict append W .header \n$line
      }
      if {[string length [dict get $W .header]]>100000} {
        error "HTTP request header too big - possible DOS attack"
      }
    } elseif {$n==0} {
      # We have reached the blank line that terminates the header.
      global argv0
      set a0 [file normalize $argv0]
      dict set W SCRIPT_FILENAME $a0
      dict set W DOCUMENT_ROOT [file dir $a0]
      if {[wappInt-parse-header $chan]} {
        catch {close $chan}
        return
      }
      set len 0
      if {[dict exists $W CONTENT_LENGTH]} {
        set len [dict get $W CONTENT_LENGTH]
      }
      if {$len>0} {
        # Still need to read the query content
        dict set W .toread $len
      } else {
        # There is no query content, so handle the request immediately
        set wapp $W
        wappInt-handle-request $chan 0
      }
    }
  } else {
    # If .toread is set, that means we are reading the query content.
    # Continue reading until .toread reaches zero.
    set got [read $chan [dict get $W .toread]]
    dict append W CONTENT $got
    dict set W .toread [expr {[dict get $W .toread]-[string length $got]}]
    if {[dict get $W .toread]<=0} {
      # Handle the request as soon as all the query content is received
      set wapp $W
      wappInt-handle-request $chan 0
    }
  }
}

# Decode the HTTP request header.
#
# This routine is always running inside of a [catch], so if
# any problems arise, simply raise an error.
#
proc wappInt-parse-header {chan} {
  upvar #0 wappInt-$chan W
  set hdr [split [dict get $W .header] \n]
  if {$hdr==""} {return 1}
  set req [lindex $hdr 0]
  dict set W REQUEST_METHOD [set method [lindex $req 0]]
  if {[lsearch {GET HEAD POST} $method]<0} {
    error "unsupported request method: \"[dict get $W REQUEST_METHOD]\""
  }
  set uri [lindex $req 1]
  set split_uri [split $uri ?]
  set uri0 [lindex $split_uri 0]
  if {![regexp {^/[-.a-z0-9_/]*$} $uri0]} {
    error "invalid request uri: \"$uri0\""
  }
  dict set W REQUEST_URI $uri0
  dict set W PATH_INFO $uri0
  set uri1 [lindex $split_uri 1]
  dict set W QUERY_STRING $uri1
  set n [llength $hdr]
  for {set i 1} {$i<$n} {incr i} {
    set x [lindex $hdr $i]
    if {![regexp {^(.+): +(.*)$} $x all name value]} {
      error "invalid header line: \"$x\""
    }
    set name [string toupper $name]
    switch -- $name {
      REFERER {set name HTTP_REFERER}
      USER-AGENT {set name HTTP_USER_AGENT}
      CONTENT-LENGTH {set name CONTENT_LENGTH}
      CONTENT-TYPE {set name CONTENT_TYPE}
      HOST {set name HTTP_HOST}
      COOKIE {set name HTTP_COOKIE}
      ACCEPT-ENCODING {set name HTTP_ACCEPT_ENCODING}
      default {set name .hdr:$name}
    }
    dict set W $name $value
  }
  return 0
}

# Decode the QUERY_STRING parameters from a GET request or the
# application/x-www-form-urlencoded CONTENT from a POST request.
#
# This routine sets the ".qp" element of the ::wapp dict as a signal
# that query parameters have already been decoded.
#
proc wappInt-decode-query-params {} {
  global wapp
  dict set wapp .qp 1
  if {[dict exists $wapp QUERY_STRING]} {
    foreach qterm [split [dict get $wapp QUERY_STRING] &] {
      set qsplit [split $qterm =]
      set nm [lindex $qsplit 0]
      if {[regexp {^[a-z][a-z0-9]*$} $nm]} {
        dict set wapp $nm [wappInt-decode-url [lindex $qsplit 1]]
      }
    }
  }
  if {[dict exists $wapp CONTENT_TYPE] && [dict exists $wapp CONTENT]} {
    set ctype [dict get $wapp CONTENT_TYPE]
    if {$ctype=="application/x-www-form-urlencoded"} {
      foreach qterm [split [string trim [dict get $wapp CONTENT]] &] {
        set qsplit [split $qterm =]
        set nm [lindex $qsplit 0]
        if {[regexp {^[a-z][-a-z0-9_]*$} $nm]} {
          dict set wapp $nm [wappInt-decode-url [lindex $qsplit 1]]
        }
      }
    } elseif {[string match multipart/form-data* $ctype]} {
      regexp {^(.*?)\r\n(.*)$} [dict get $wapp CONTENT] all divider body
      set ndiv [string length $divider]
      while {[string length $body]} {
        set idx [string first $divider $body]
        set unit [string range $body 0 [expr {$idx-3}]]
        set body [string range $body [expr {$idx+$ndiv+2}] end]
        if {[regexp {^Content-Disposition: form-data; (.*?)\r\n\r\n(.*)$} \
             $unit unit hdr content]} {
          if {[regexp {name="(.*)"; filename="(.*)"\r\nContent-Type: (.*?)$}\
                $hdr hr name filename mimetype]} {
            dict set wapp $name.filename \
              [string map [list \\\" \" \\\\ \\] $filename]
            dict set wapp $name.mimetype $mimetype
            dict set wapp $name.content $content
          } elseif {[regexp {name="(.*)"} $hdr hr name]} {
            dict set wapp $name $content
          }
        }
      }
    }
  }
}

# Invoke application-supplied methods to generate a reply to
# a single HTTP request.
#
# This routine always runs within [catch], so handle exceptions by
# invoking [error].
#
proc wappInt-handle-request {chan useCgi} {
  global wapp
  dict set wapp .reply {}
  dict set wapp .mimetype {text/html; charset=utf-8}
  dict set wapp .reply-code {200 Ok}
  dict set wapp .csp {default-src 'self'}

  # Set up additional CGI environment values
  #
  if {![dict exists $wapp HTTP_HOST]} {
    dict set wapp BASE_URL {}
  } elseif {[dict exists $wapp HTTPS]} {
    dict set wapp BASE_URL https://[dict get $wapp HTTP_HOST]
  } else {
    dict set wapp BASE_URL http://[dict get $wapp HTTP_HOST]
  }
  if {![dict exists $wapp REQUEST_URI]} {
    dict set wapp REQUEST_URI /
  } elseif {[regsub {\?.*} [dict get $wapp REQUEST_URI] {} newR]} {
    # Some servers (ex: nginx) append the query parameters to REQUEST_URI.
    # These need to be stripped off
    dict set wapp REQUEST_URI $newR
  }
  if {[dict exists $wapp SCRIPT_NAME]} {
    dict append wapp BASE_URL [dict get $wapp SCRIPT_NAME]
  } else {
    dict set wapp SCRIPT_NAME {}
  }
  if {![dict exists $wapp PATH_INFO]} {
    # If PATH_INFO is missing (ex: nginx) then construct it
    set URI [dict get $wapp REQUEST_URI]
    set skip [string length [dict get $wapp SCRIPT_NAME]]
    dict set wapp PATH_INFO [string range $URI $skip end]
  }
  if {[regexp {^/([^/]+)(.*)$} [dict get $wapp PATH_INFO] all head tail]} {
    dict set wapp PATH_HEAD $head
    dict set wapp PATH_TAIL [string trimleft $tail /]
  } else {
    dict set wapp PATH_INFO {}
    dict set wapp PATH_HEAD {}
    dict set wapp PATH_TAIL {}
  }
  dict set wapp SELF_URL [dict get $wapp BASE_URL]/[dict get $wapp PATH_HEAD]

  # Parse query parameters from the query string, the cookies, and
  # POST data
  #
  if {[dict exists $wapp HTTP_COOKIE]} {
    foreach qterm [split [dict get $wapp HTTP_COOKIE] {;}] {
      set qsplit [split [string trim $qterm] =]
      set nm [lindex $qsplit 0]
      if {[regexp {^[a-z][-a-z0-9_]*$} $nm]} {
        dict set wapp $nm [wappInt-decode-url [lindex $qsplit 1]]
      }
    }
  }
  set same_origin 0
  if {[dict exists $wapp HTTP_REFERER]} {
    set referer [dict get $wapp HTTP_REFERER]
    set base [dict get $wapp BASE_URL]
    if {$referer==$base || [string match $base/* $referer]} {
      set same_origin 1
    }
  }
  dict set wapp SAME_ORIGIN $same_origin
  if {$same_origin} {
    wappInt-decode-query-params
  }

  # Invoke the application-defined handler procedure for this page
  # request.  If an error occurs while running that procedure, generate
  # an HTTP reply that contains the error message.
  #
  wapp-before-dispatch-hook
  wappInt-trace
  set mname [dict get $wapp PATH_HEAD]
  if {[catch {
    if {$mname!="" && [llength [info proc wapp-page-$mname]]>0} {
      wapp-page-$mname
    } else {
      wapp-default
    }
  } msg]} {
    if {[wapp-param WAPP_MODE]=="local" || [wapp-param WAPP_MODE]=="server"} {
      puts "ERROR: $::errorInfo"
    }
    wapp-reset
    wapp-reply-code "500 Internal Server Error"
    wapp-mimetype text/html
    wapp-trim {
      <h1>Wapp Application Error</h1>
      <pre>%html($::errorInfo)</pre>
    }
    dict unset wapp .new-cookies
  }

  # Transmit the HTTP reply
  #
  if {$chan=="stdout"} {
    puts $chan "Status: [dict get $wapp .reply-code]\r"
  } else {
    puts $chan "HTTP/1.1 [dict get $wapp .reply-code]\r"
    puts $chan "Server: wapp\r"
    puts $chan "Connection: close\r"
  }
  if {[dict exists $wapp .reply-extra]} {
    foreach {name value} [dict get $wapp .reply-extra] {
      puts $chan "$name: $value\r"
    }
  }
  if {[dict exists $wapp .csp]} {
    puts $chan "Content-Security-Policy: [dict get $wapp .csp]\r"
  }
  set mimetype [dict get $wapp .mimetype]
  puts $chan "Content-Type: $mimetype\r"
  if {[dict exists $wapp .new-cookies]} {
    foreach {nm val} [dict get $wapp .new-cookies] {
      if {[regexp {^[a-z][-a-z0-9_]*$} $nm]} {
        if {$val==""} {
          puts $chan "Set-Cookie: $nm=; HttpOnly; Path=/; Max-Age=1\r"
        } else {
          set val [wappInt-enc-url $val]
          puts $chan "Set-Cookie: $nm=$val; HttpOnly; Path=/\r"
        }
      }
    }
  }
  if {[string match text/* $mimetype]} {
    set reply [encoding convertto utf-8 [dict get $wapp .reply]]
    if {[regexp {\ygzip\y} [wapp-param HTTP_ACCEPT_ENCODING]]} {
      catch {
        set x [zlib gzip $reply]
        set reply $x
        puts $chan "Content-Encoding: gzip\r"
      }
    }
  } else {
    set reply [dict get $wapp .reply]
  }
  puts $chan "Content-Length: [string length $reply]\r"
  puts $chan \r
  puts -nonewline $chan $reply
  flush $chan
  wappInt-close-channel $chan
}

# This routine runs just prior to request-handler dispatch.  The
# default implementation is a no-op, but applications can override
# to do additional transformations or checks.
#
proc wapp-before-dispatch-hook {} {return}

# Process a single CGI request
#
proc wappInt-handle-cgi-request {} {
  global wapp env
  foreach key {
    CONTENT_LENGTH
    CONTENT_TYPE
    DOCUMENT_ROOT
    HTTP_ACCEPT_ENCODING
    HTTP_COOKIE
    HTTP_HOST
    HTTP_REFERER
    HTTP_USER_AGENT
    HTTPS
    PATH_INFO
    QUERY_STRING
    REMOTE_ADDR
    REQUEST_METHOD
    REQUEST_URI
    REMOTE_USER
    SCRIPT_FILENAME
    SCRIPT_NAME
    SERVER_NAME
    SERVER_PORT
    SERVER_PROTOCOL
  } {
    if {[info exists env($key)]} {
      dict set wapp $key $env($key)
    }
  }
  set len 0
  if {[dict exists $wapp CONTENT_LENGTH]} {
    set len [dict get $wapp CONTENT_LENGTH]
  }
  if {$len>0} {
    fconfigure stdin -translation binary
    dict set wapp CONTENT [read stdin $len]
  }
  dict set wapp WAPP_MODE cgi
  fconfigure stdout -translation binary
  wappInt-handle-request stdout 1
}

# Process new text received on an inbound SCGI request
#
proc wappInt-scgi-readable {chan} {
  if {[catch [list wappInt-scgi-readable-unsafe $chan] msg]} {
    puts stderr "$msg\n$::errorInfo"
    wappInt-close-channel $chan
  }
}
proc wappInt-scgi-readable-unsafe {chan} {
  upvar #0 wappInt-$chan W wapp wapp
  if {![dict exists $W .toread]} {
    # If the .toread key is not set, that means we are still reading
    # the header.
    #
    # An SGI header is short.  This implementation assumes the entire
    # header is available all at once.
    #
    dict set W .remove_addr [dict get $W REMOTE_ADDR]
    set req [read $chan 15]
    set n [string length $req]
    scan $req %d:%s len hdr
    incr len [string length "$len:,"]
    append hdr [read $chan [expr {$len-15}]]
    foreach {nm val} [split $hdr \000] {
      if {$nm==","} break
      dict set W $nm $val
    }
    set len 0
    if {[dict exists $W CONTENT_LENGTH]} {
      set len [dict get $W CONTENT_LENGTH]
    }
    if {$len>0} {
      # Still need to read the query content
      dict set W .toread $len
    } else {
      # There is no query content, so handle the request immediately
      dict set W SERVER_ADDR [dict get $W .remove_addr]
      set wapp $W
      wappInt-handle-request $chan 0
    }
  } else {
    # If .toread is set, that means we are reading the query content.
    # Continue reading until .toread reaches zero.
    set got [read $chan [dict get $W .toread]]
    dict append W CONTENT $got
    dict set W .toread [expr {[dict get $W .toread]-[string length $got]}]
    if {[dict get $W .toread]<=0} {
      # Handle the request as soon as all the query content is received
      dict set W SERVER_ADDR [dict get $W .remove_addr]
      set wapp $W
      wappInt-handle-request $chan 0
    }
  }
}

# Start up the wapp framework.  Parameters are a list passed as the
# single argument.
#
#    -server $PORT         Listen for HTTP requests on this TCP port $PORT
#
#    -local $PORT          Listen for HTTP requests on 127.0.0.1:$PORT
#
#    -scgi $PORT           Listen for SCGI requests on 127.0.0.1:$PORT
#
#    -remote-scgi $PORT    Listen for SCGI requests on TCP port $PORT
#
#    -cgi                  Handle a single CGI request
#
# With no arguments, the behavior is called "auto".  In "auto" mode,
# if the GATEWAY_INTERFACE environment variable indicates CGI, then run
# as CGI.  Otherwise, start an HTTP server bound to the loopback address
# only, on an arbitrary TCP port, and automatically launch a web browser
# on that TCP port.
#
# Additional options:
#
#    -fromip GLOB         Reject any incoming request where the remote
#                         IP address does not match the GLOB pattern.  This
#                         value defaults to '127.0.0.1' for -local and -scgi.
#
#    -nowait              Do not wait in the event loop.  Return immediately
#                         after all event handlers are established.
#
#    -trace               "puts" each request URL as it is handled, for
#                         debugging
#
#    -lint                Run wapp-safety-check on the application instead
#                         of running the application itself
#
#    -Dvar=value          Set TCL global variable "var" to "value"
#
#
proc wapp-start {arglist} {
  global env
  set mode auto
  set port 0
  set nowait 0
  set fromip {}
  set n [llength $arglist]
  for {set i 0} {$i<$n} {incr i} {
    set term [lindex $arglist $i]
    if {[string match --* $term]} {set term [string range $term 1 end]}
    switch -glob -- $term {
      -server {
        incr i;
        set mode "server"
        set port [lindex $arglist $i]
      }
      -local {
        incr i;
        set mode "local"
        set fromip 127.0.0.1
        set port [lindex $arglist $i]
      }
      -scgi {
        incr i;
        set mode "scgi"
        set fromip 127.0.0.1
        set port [lindex $arglist $i]
      }
      -remote-scgi {
        incr i;
        set mode "remote-scgi"
        set port [lindex $arglist $i]
      }
      -cgi {
        set mode "cgi"
      }
      -fromip {
        incr i
        set fromip [lindex $arglist $i]
      }
      -nowait {
        set nowait 1
      }
      -trace {
        proc wappInt-trace {} {
          set q [wapp-param QUERY_STRING]
          set uri [wapp-param BASE_URL][wapp-param PATH_INFO]
          if {$q!=""} {append uri ?$q}
          puts $uri
        }
      }
      -lint {
        set res [wapp-safety-check]
        if {$res!=""} {
          puts "Potential problems in this code:"
          puts $res
          exit 1
        } else {
          exit
        }
      }
      -D*=* {
        if {[regexp {^.D([^=]+)=(.*)$} $term all var val]} {
          set ::$var $val
        }
      }
      default {
        error "unknown option: $term"
      }
    }
  }
  if {$mode=="auto"} {
    if {[info exists env(GATEWAY_INTERFACE)]
        && [string match CGI/1.* $env(GATEWAY_INTERFACE)]} {
      set mode cgi
    } else {
      set mode local
    }
  }
  if {$mode=="cgi"} {
    wappInt-handle-cgi-request
  } else {
    wappInt-start-listener $port $mode $fromip
    if {!$nowait} {
      vwait ::forever
    }
  }
}

# Call this version 1.0
package provide wapp 1.0
