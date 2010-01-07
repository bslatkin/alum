////////////////////////////////////////////////////////////////////////////////
// Helpers

function bg() {
  return chrome.extension.getBackgroundPage();
}

function fail(message) {
  window.alert(message);
}

function objectSize(obj) {
  var size = 0;
  var key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
}

function withForemostTab(callback) {
  chrome.windows.getCurrent(function(window) {
    chrome.tabs.getSelected(window.id, function(tab) {
      callback(window, tab);
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
// Classes

////// Layout
function Layout(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

Layout.fromWindow = function(window) {
  return new Layout(window.left, window.top, window.width, window.height);
}

////// Slot
function Slot(number) {
  this.number = number;
  this.windowId = -1;  // unset
}

Slot.add = function(slot) {
  chrome.windows.getCurrent(function(window) {
    slot.windowId = window.id;
    bg().SlotMap[slot.number] = slot;
    bg().WindowMap[window.id] = slot;
  });
}

Slot.count = function() {
  return objectSize(bg().SlotMap);
}

Slot.get = function(number) {
  return bg().SlotMap[number];
}

Slot.rotate = function(positive) {
  if (Slot.count() == 0) {
    return;
  }
  Slot.withSortedWindows(function(windowArray) {
    // Presumably view 0 is the most important, so we do not want it to be
    // overlapped during any rotation animations, so move it's successor first.
    var count = Slot.count();
    var step = positive ? 1 : -1;
    var from = 0;
    var to = (step + count) % count;
    var finalLayout = Layout.fromWindow(windowArray[0]);
    for (var i = 1; i < count; ++i) {
      Slot.get(from).setLayout(Layout.fromWindow(windowArray[to]));
      from = ((step * i) + count) % count;
      to = ((step * (i + 1)) + count) % count;
    }
    Slot.get(from).setLayout(finalLayout);
  });

  // TODO: Preserve focus on the formerly focused window/tab? Maybe the last
  // one to move should be the currently focused on? but then it may go behind
  // some other window in the meantime, which is weird.
}

Slot.withSortedWindows = function(callback) {
  chrome.windows.getAll({populate: false}, function(windowArray) {
    // Sort windowArray by slots, ignoring unslotted windows.
    var sortedWindows = [];
    for (var i = 0; i < windowArray.length; ++i) {
      var slot = bg().WindowMap[windowArray[i].id];
      if (slot) {
        sortedWindows[slot.number] = windowArray[i];
      }
    }
    callback(sortedWindows);
  });
}

Slot.prototype.appendTab = function(tab) {
  this.getTabCount(function(count) {
    chrome.tabs.move(tab.id, {
      windowId: this.windowId,
      index: count+1
    });
  });
}

Slot.prototype.focus = function() {
  chrome.tabs.getSelected(this.windowId, function(tab) {
    chrome.tabs.executeScript(tab.id, {code: "window.focus();"});
  });
}

Slot.prototype.setLayout = function(layout) {
  chrome.windows.update(this.windowId, {
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height
  });
}

Slot.prototype.next = function() {
  return Slot.get((this.number + 1) % Slot.count());
}

Slot.prototype.previous = function() {
  return Slot.get((this.number - 1) % Slot.count());
}

Slot.prototype.getTabCount = function(callback) {
  chrome.tabs.getAllInWindow(this.windowId, function(tabs) {
    callback(tabs.length);
  });
};
