document.addEventListener("keydown", function(event) {
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    // Only send through hotkey commands.
    chrome.extension.sendRequest({
      which: event.which,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    });
  }
}, false);
