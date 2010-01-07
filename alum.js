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

Layout.prototype.apply = function(windowId) {
  chrome.windows.update(windowId, {
    left: this.x,
    top: this.y,
    width: this.width,
    height: this.height
  });
}

////// Slot
function Slot(number) {
  this.number = number;
  this.windowId = -1;  // unset
}

// TODO: Rename to addCurrent.
Slot.add = function(slot) {
  chrome.windows.getCurrent(function(window) {
    slot.windowId = window.id;
    Slot.set(slot);
  });
}

Slot.count = function() {
  return objectSize(bg().SlotMap);
}

Slot.set = function(slot) {
  bg().SlotMap[slot.number] = slot;
  bg().WindowMap[slot.windowId] = slot;
}

Slot.get = function(number) {
  return bg().SlotMap[number];
}

Slot.rotate = function(positive) {
  if (Slot.count() == 0) {
    return;
  }
  withForemostTab(function(frontWindow, frontTab) {
    var frontSlot = bg().WindowMap[frontWindow.id];

    Slot.withSortedWindows(function(windowArray) {
      // Presumably view 0 is the most important, so we do not want it to be
      // overlapped during any rotation animations, so move it's successor first.
      var count = Slot.count();
      var step = positive ? 1 : -1;
      var newWindowIds = [];
      for (var i = 0; i < count; ++i) {
        var from = ((step * i) + count) % count;
        var to = ((step * (i + 1)) + count) % count;
        var fromWindowId = windowArray[from].id;
        Layout.fromWindow(windowArray[to]).apply(fromWindowId);
        newWindowIds[to] = fromWindowId;
      }
      // Update each slot with its new window ID.
      for (var j = 0; j < count; ++j) {
        Slot.get(j).windowId = newWindowIds[j];
      }
    });

    // Preserve focus on previously focused window.
    if (typeof(frontSlot) != "undefined") {
      console.log("focusing slot: " + frontSlot.number + ", window: " + frontSlot.windowId);
      frontSlot.focus();
    }
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

Slot.prototype.getTabCount = function(callback) {
  chrome.tabs.getAllInWindow(this.windowId, function(tabs) {
    callback(tabs.length);
  });
};
