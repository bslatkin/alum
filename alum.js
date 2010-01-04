////////////////////////////////////////////////////////////////////////////////
// Classes
function Slot(number) {
  this.number = number;
  this.windowId = -1;  // unset
}

Slot.prototype.getTabCount = function(callback) {
  chrome.tabs.getAllInWindow(this.windowId, function(tabs) {
    callback(tabs.length);
  });
};

Slot.prototype.moveSelectedTab = function(number) {
  var slot = getSlot(number);
  chrome.tabs.getSelected(this.windowId, function(tab) {
    slot.getTabCount(function(count) {
      var moveProperties = {
        windowId: slot.windowId,
        index: count-1
      };
      chrome.tabs.move(tab.tabId, moveProperties);
    });
  });
}
