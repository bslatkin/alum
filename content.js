// Send through hotkey key-strokes whenever a key modifier is present.
document.addEventListener("keydown", function(event) {
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    chrome.extension.sendRequest({
      type: "key event",
      keyCode: event.keyCode,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    });
  }
  return false;
}, false);


// Send through right-clicks so we can track the active right-click window.
document.addEventListener("contextmenu", function(event) {
  chrome.extension.sendRequest({
    type: "right-click event",
    url: window.location.toString()
  });
  return false;
}, true);
