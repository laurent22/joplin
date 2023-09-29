(function($){
    var // A few reused jQuery objects.
        win = $(this),
        html = $('html'),

        // All the elements being monitored.
        elems = $([]),

        // The current element.
        current,

        // The previous current element.
        previous,

        // Create the floating scrollbar.
        scroller = $('<div id="floating-scrollbar"><div/></div>'),
        scrollerInner = scroller.children();
      

    // Initialize the floating scrollbar.
    scroller
      .hide()
      .css({
        position: 'fixed',
        bottom: 0,
        height: '30px',
        overflowX: 'auto',
        overflowY: 'hidden'
      })
      .scroll(function() {
        // If there's a current element, set its scroll appropriately.
        current && current.scrollLeft(scroller.scrollLeft())
      });

    scrollerInner.css({
      border: '1px solid #fff',
      opacity: 0.01
    });

    // Call on elements to monitor their position and scrollness. Pass `false` to
    // stop monitoring those elements.
    $.fn.floatingScrollbar = function( state ) {
      if ( state === false ) {
        // Remove these elements from the list.
        elems = elems.not(this);
        // Stop monitoring elements for scroll.
        this.unbind('scroll', scrollCurrent);
        if ( !elems.length ) {
          // No elements remain, so detach scroller and unbind events.
          scroller.detach();
          win.unbind('resize scroll', update);
        }
      } else if ( this.length ) {
        // Don't assume the set is non-empty!
        if ( !elems.length ) {
          // Adding elements for the first time, so bind events.
          win.resize(update).scroll(update);
        }
        // Add these elements to the list.
        elems = elems.add(this);
      }
      // Update.
      update();
      // Make chainable.
      return this;
    };

    // Call this to force an update, for instance, if elements were inserted into
    // the DOM before monitored elements, changing their vertical position.
    $.floatingScrollbarUpdate = update;

    // Hide or show the floating scrollbar.
    function setState( state ) {
      scroller.toggle(!!state);
    }

    // Sync floating scrollbar if element content is scrolled.
    function scrollCurrent() {
      current && scroller.scrollLeft(current.scrollLeft())
    }

    // This is called on window scroll or resize, or when elements are added or
    // removed from the internal elems list.
    function update() {
      previous = current;
      current = null;

      // Find the first element whose content is visible, but whose bottom is
      // below the viewport.
      elems.each(function(){
        var elem = $(this),
            top = elem.offset().top,
            bottom = top + elem.height(),
            viewportBottom = win.scrollTop() + win.height(),
            topOffset = 30;

        if ( top + topOffset < viewportBottom && bottom > viewportBottom ) {
          current = elem;
          return false;
        }
      });

      // Abort if no elements were found.
      if ( !current ) { setState(); return; }

      // Test to see if the current element has a scrollbar.
      var scroll = current.scrollLeft(),
          scrollMax = current.scrollLeft(90019001).scrollLeft(),
          widthOuter = current.innerWidth(),
          widthInner = widthOuter + scrollMax;

      current.scrollLeft(scroll);

      // Abort if the element doesn't have a scrollbar.
      if ( widthInner <= widthOuter ) { setState(); return; }

      // Show the floating scrollbar.
      setState(true);

      // Sync floating scrollbar if element content is scrolled.
      if ( !previous || previous[0] !== current[0] ) {
        previous && previous.unbind('scroll', scrollCurrent);
        current.scroll(scrollCurrent).after(scroller);
      }

      // Adjust the floating scrollbar as-necessary.
      scroller
        .css({
          left: current.offset().left - win.scrollLeft(),
          width: widthOuter
        })
        .scrollLeft(scroll);

      scrollerInner.width(widthInner);
    }

  })(jQuery);

  $(function () {
    $('.joplin-table-div').floatingScrollbar();
  });