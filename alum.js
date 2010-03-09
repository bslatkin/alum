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

function objectsEqual(first, second) {
  if (objectSize(first) != objectSize(second)) {
    return false;
  }
  for (key in first) {
    if (first.hasOwnProperty(key) &&
        first[key] != second[key]) {
      return false;
    }
  }
  return true;
}

function withForemostTab(callback) {
  chrome.windows.getCurrent(function(window) {
    chrome.tabs.getSelected(window.id, function(tab) {
      callback(window, tab);
    });
  });
}

// Maps key codes to HTML presentation.
var KEY_CODES = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  19: "Break",
  20: "Caps lock",
  27: "Escape",
  33: "Page up",
  34: "Page down",
  35: "End",
  36: "Home",
  37: "&larr;",
  38: "&uarr;",
  39: "&rarr;",
  40: "&darr;",
  45: "Insert",
  46: "Delete",
  96: "Num 0",
  97: "Num 1",
  98: "Num 2",
  99: "Num 3",
  100: "Num 4",
  101: "Num 5",
  102: "Num 6",
  103: "Num 7",
  104: "Num 8",
  105: "Num 9",
  106: "Multiply",
  107: "Add",
  109: "Subtract",
  110: "Point",
  111: "Divide",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  124: "F13",
  125: "F14",
  126: "F15",
  127: "F16",
  128: "F17",
  129: "F18",
  130: "F19",
  144: "Num lock",
  145: "Scroll lock",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};

// Modifier keys that should not be included.
var META_KEYS = {
  91: "left meta",
  92: "right meta",
  16: "shift",
  17: "control",
  18: "alt",
  93: "select ignored"
};

function getPressedKeys(event) {
  var inputKey = event.keyCode;
  if (KEY_CODES[inputKey]) {
    inputKey = KEY_CODES[inputKey];
  } else {
    inputKey = String.fromCharCode(event.keyCode);
  }
  // console.log("key: " + inputKey +
  //   ", shift " + event.shiftKey +
  //   ", ctrl " + event.ctrlKey +
  //   ", alt " + event.altKey +
  //   ", meta " + event.metaKey +
  //   ", raw " + event.keyCode);
  var pressed = {
    "RawCode": event.keyCode
  };
  if (event.shiftKey) pressed["Shift"] = true;
  if (event.ctrlKey) pressed["Control"] = true;
  if (event.altKey) pressed["Alt"] = true;
  if (event.metaKey) pressed["Meta"] = true;
  if (!META_KEYS[event.keyCode]) {
    pressed["KeyCode"] = inputKey;
  }
  return pressed;
}

function makeKeyString(pressed) {
  var keyString = "";
  if (pressed["Shift"]) keyString += "Shift + ";
  if (pressed["Control"]) keyString += "Control + ";
  if (pressed["Meta"]) keyString += "Meta + ";
  if (pressed["Alt"]) keyString += "Alt + ";
  if (pressed["KeyCode"]) {
    keyString += pressed["KeyCode"]
  } else {
    keyString += "?";
  }
  return keyString;
}

function loadHotkeyConfig(hotkeyId) {
  var value = localStorage.getItem("config:" + hotkeyId);
  if (value) {
    return JSON.parse(value);
  } else {
    return null;
  }
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
function Slot(number, windowId) {
  this.number = number;
  if (windowId == null) {
    this.windowId = -1;  // unset
  } else {
    this.windowId = windowId;
  }
}

Slot.addCurrent = function(slot) {
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
  if (bg().Rotating) {
    console.log("Already rotating!");
    return;
  }
  bg().Rotating = true;
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
          // TODO: This doesn't work right now due to chrome extensions API
          // limitations with their security model.
          if (typeof(frontSlot) != "undefined") {
            frontSlot.focus();
          }
          bg().Rotating = false;
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

Slot.removeWindow = function(windowId) {
  var removeSlot = bg().WindowMap[windowId];
  if (!removeSlot) return;
  console.log('removing unused slot: ' + removeSlot.number + ", window " + windowId);
  var count = Slot.count();
  var newNumber = 0;
  for (var i = 0; i < count; ++i) {
    if (i == removeSlot.number) continue;
    var slot = bg().SlotMap[i];
    slot.number = newNumber++;
    bg().SlotMap[slot.number] = slot;
    bg().WindowMap[slot.windowId] = slot;
  }
  delete bg().SlotMap[newNumber];
  delete bg().WindowMap[windowId];
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
  // chrome.tabs.getSelected(this.windowId, function(tab) {
  //   console.log("found tab " + tab.id);
  //   try {
  //     chrome.tabs.executeScript(
  //       tab.id,
  //       {
  //         code: 'window.focus();'
  //       },
  //       function() {
  //         console.log("all done focusing");
  //       })
  //   } catch (e) {
  //     console.log('Exception doing that: ' + e);
  //   }
  // });
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
