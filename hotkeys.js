document.addEventListener("keydown", function(event) {
  chrome.extension.sendRequest({
    which: event.which,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey
  });
}, false);
