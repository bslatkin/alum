// Send through hotkey key-strokes whenever a key modifier is present.
document.addEventListener("keydown", function(event) {
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    chrome.extension.sendRequest({
      keyCode: event.keyCode,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    });
  }
  return false;
}, false);
