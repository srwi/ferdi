/**
 * Inject data from Ferdi into the webview
 */
export default createInjectScript = () => {
  const data = {
    currentUrl: window.ferdi.stores.services.active.webview.src,
  }
};