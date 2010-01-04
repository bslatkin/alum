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

Slot.prototype.moveSelectedTab = function(destSlot) {
  chrome.tabs.getSelected(this.windowId, function(tab) {
    destSlot.getTabCount(function(count) {
      chrome.tabs.move(tab.id, {
        windowId: destSlot.windowId,
        index: count+1
      });
    });
  });
}
