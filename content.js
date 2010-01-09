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

// Not used yet because I need window.focus.
//chrome.extension.onRequest.addListener(
//  function(request, sender, sendResponse) {
//    console.log('got the event! ' + window.focus);
//    try {
//      window.focus();
//    } catch (e) {
//      console.log('exception: ' + e);
//    }
//    sendResponse({'foo': 'got it!'});
//  });
