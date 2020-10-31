window.chrome.tabs = {
  query: (options) => {
    // Always just return the current tab

    return [
      {
        id: 1,
        windowId: 0,
        active: true,
        pinned: false,
        incognito: false,
        url: 'https://google.com'
      }
    ];
  }
}