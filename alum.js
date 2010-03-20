////////////////////////////////////////////////////////////////////////////////
// Helpers

function bg() {
  return chrome.extension.getBackgroundPage();
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
    return;
  }
  var count = Slot.count();
  if (count <= 1) {
    return;
  }
  bg().Rotating = true;
  Slot.withSortedWindows(function(fromWindowArray) {
    var toWindowArray = fromWindowArray.slice();
    var dummyWindowId = fromWindowArray[0].id
    if (positive) {
      toWindowArray.push(toWindowArray.shift());  // 0 -> N-1
    } else {
      fromWindowArray.reverse();
      fromWindowArray.unshift(fromWindowArray.pop()); // N-1 -> 0
      toWindowArray.reverse();
    }
    chrome.tabs.create(
      {"windowId": dummyWindowId,
       "selected": true,
       "url": positive ? "right.html" : "left.html" }, function(dummyTab) {
      var popAndUpdate = function(index, tabIndex) {
        if (index >= fromWindowArray.length) {
          chrome.tabs.remove(dummyTab.id, function() {
            bg().Rotating = false;
          });
          return;
        }
        if (tabIndex >= fromWindowArray[index].tabs.length) {
          popAndUpdate(index+1, 0);
        } else {
          chrome.tabs.move(
              fromWindowArray[index].tabs[tabIndex].id,
              {"windowId": toWindowArray[index].id, "index": tabIndex},
              function() {
                popAndUpdate(index, tabIndex+1);

                // Keep the selected tab selected in the new window.
                if (fromWindowArray[index].tabs[tabIndex].selected) {
                  chrome.tabs.update(
                      fromWindowArray[index].tabs[tabIndex].id,
                      {"selected": true});
                }
              });
        }
      }
      popAndUpdate(0, 0);
    });
  });
}

Slot.withSortedWindows = function(callback) {
  chrome.windows.getAll({populate: true}, function(windowArray) {
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

Slot.prototype.takeCurrentTab = function() {
  var slot = this;
  chrome.windows.getCurrent(function(window) {
    chrome.tabs.getSelected(window.id, function(tab) {
      if (slot.windowId == tab.windowId) return;  // Tab already in window.
      chrome.tabs.getAllInWindow(slot.windowId, function(allTabs) {
        var done = function() {
          chrome.tabs.move(
              tab.id, {"windowId": slot.windowId, "index": allTabs.length});
        };
        chrome.tabs.getAllInWindow(window.id, function(sourceTabs) {
          if (sourceTabs.length == 1) {
            // Source window only has one tab, so open a dummy tab to
            // ensure the window does not disappear.
            chrome.tabs.create({"windowId": window.id}, done);
          } else {
            done();
          }
        });
      });
    });
  });
}
