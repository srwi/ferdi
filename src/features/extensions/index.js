import { remote } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { observable } from 'mobx';

const debug = require('debug')('Ferdi:feature:extensions');

const defaultState = {};

export const state = observable(defaultState);

export default async function initialize() {
  debug('Initialize extensions feature');

  // Create extensions folder
  const extensionsPath = path.join(remote.app.getPath('userData'), 'extensions');
  await fs.ensureDir(extensionsPath);

  let activeExtensions = [];
  let webviews = [];

  const loadExtensionInWebView = async (extension, webview) => {
    const webContents = remote.webContents.fromId(webview.getWebContentsId());
    await webContents.session.loadExtension(extension);
  };

  const loadExtension = async (extension, loadGlobally = true) => {
    const extPath = path.join(extensionsPath, extension);

    // Don't load already loaded extensions
    if (activeExtensions.includes(extension)) {
      return;
    }
    activeExtensions.push(extension);
    
    // Load extension globally
    if (loadGlobally) {
      await remote.session.defaultSession.loadExtension(extPath);
    }

    // Load extension in all webviews
    for (const webview of webviews) {
      loadExtensionInWebView(extPath, webview);
    }
  };

  const loadExtensions = (extensions, loadGlobally = true) => {
    for(const extension of extensions) {
      loadExtension(extension, loadGlobally);
    }
  };

  console.log('Loading extensions');

  const useWebview = async (webview) => {
    console.log('Inject extension to webview');

    // Don't load already loaded webviews
    if (webviews.includes(webview)) {
      return;
    }
    
    webviews.push(webview);

    // Load all currently loaded exntesions into the webview
    for(const extension of activeExtensions) {
      const extPath = path.join(extensionsPath, extension);
      loadExtensionInWebView(extPath, webview);
    }
  }

  // Load default extensions
  loadExtensions(['extension']);

  window.ferdi.features.extensions = {
    state,
    useWebview,
    loadExtension,
    loadExtensions,
  };
}
