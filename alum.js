var events = [];

function getEvents() {
  return events;
}

function handleAddWindow(window) {
  events.push(window);
}

function handleRemoveWindow(windowId) {
  events.push(windowId);
}

function initAlum() {
  chrome.windows.onCreated.addListener(function(window) {
    handleAddWindow(window);
  });
  chrome.windows.onRemoved.addListener(function(windowId) {
    handleRemoveWindow(windowId);
  });
}
