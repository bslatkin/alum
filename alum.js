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

Layout.buildFromWindow = function(window) {
  return new Layout(window.left, window.top, window.width, window.height);
}

Layout.prototype.apply = function(windowId, applyDone) {
  chrome.windows.update(windowId, {
    left: this.x,
    top: this.y,
    width: this.width,
    height: this.height
  }, applyDone);
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
  var count = Slot.count();
  if (count == 0) {
    return;
  }
  withForemostTab(function(frontWindow, frontTab) {
    var frontSlot = bg().WindowMap[frontWindow.id];

    Slot.withSortedWindows(function(fromWindowArray) {
      var toWindowArray = fromWindowArray.slice();
      if (positive) {
        toWindowArray.push(toWindowArray.shift());  // 0 -> N-1
      } else {
        toWindowArray.unshift(toWindowArray.pop());  // N-1 -> 0
      }

      var popAndUpdate = function(index) {
        if (index >= fromWindowArray.length) {
          // Recursion done. Update each slot with its new window ID.
          for (var j = 0; j < count; ++j) {
            Slot.get(j).windowId = toWindowArray[j].id;
          }
          // Refocus the originally focused slot.
          if (typeof(frontSlot) != "undefined") {
            console.log("focusing slot: " + frontSlot.number + ", window: " + frontSlot.windowId);
            frontSlot.focus();
          }
        } else {
          Layout.buildFromWindow(toWindowArray[index])
              .apply(fromWindowArray[index].id, function(window) {
                popAndUpdate(index+1);
              });
        }
      }
      popAndUpdate(0);
    });
  });
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
  console.log('this works here');
  chrome.tabs.getSelected(this.windowId, function(tab) {
    console.log("found tab " + tab.id);
    try {
      chrome.tabs.executeScript(
        tab.id,
        {
          code: 'window.alert("doot");'
        },
        function() {
          console.log("all done focusing");
        })
    } catch (e) {
      console.log('Exception doing that: ' + e);
    }
    // chrome.tabs.sendRequest(tab.id, {}, function(response) {
    //   console.log('received: ' + response);
    // });
  });
}

Slot.prototype.next = function() {
  var count = Slot.count();
  return (this.number + 1) % count;
}

Slot.prototype.previous = function() {
  var count = Slot.count();
  return (this.number - 1 + count) % count;
}

Slot.prototype.getTabCount = function(callback) {
  chrome.tabs.getAllInWindow(this.windowId, function(tabs) {
    callback(tabs.length);
  });
};
