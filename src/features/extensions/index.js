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

  // Current status information
  const activeExtensions = [];
  const extensionInfo = {};
  const webviews = [];

  // Helpers for getting information about extensions
  const getActiveExtensions = () => activeExtensions;
  const getExtensionInfo = key => (extensionInfo[key] || {});
  const getExtensionIcon = (key) => {
    const info = getExtensionInfo(key);
    const ferdiIcon = 'https://raw.githubusercontent.com/getferdi/ferdi/develop/branding/logo.png';

    if (!info.icons) {
      return ferdiIcon;
    }

    // Find largest icon
    let largestSize = -1;
    for (const size in info.icons) {
      if (size > largestSize) {
        largestSize = size;
      }
    }

    if (largestSize === -1) {
      return ferdiIcon;
    }

    return path.join(extensionsPath, key, info.icons[largestSize]);
  };

  // Functions for loading extensions
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

    // Load extension information
    const extInfo = await fs.readJSON(path.join(extPath, 'manifest.json'));
    extensionInfo[extension] = extInfo;
  };

  const loadExtensions = (extensions, loadGlobally = true) => {
    for (const extension of extensions) {
      loadExtension(extension, loadGlobally);
    }
  };

  const useWebview = async (webview) => {
    // Don't load already loaded webviews
    if (webviews.includes(webview)) {
      return;
    }

    webviews.push(webview);

    // Load all currently loaded exntesions into the webview
    for (const extension of activeExtensions) {
      const extPath = path.join(extensionsPath, extension);
      loadExtensionInWebView(extPath, webview);
    }
  };

  // Load all installed extensions asynchronously
  (async () => {
    const directories = (await fs.readdir(extensionsPath, { withFileTypes: true }))
      // Only use directories
      .filter(file => file.isDirectory())
      // Only get directory names
      .map(directory => directory.name);

    debug(`Found and loading ${directories.length} extensions`);

    loadExtensions(directories);
  })();

  window.ferdi.features.extensions = {
    state,
    useWebview,
    loadExtension,
    loadExtensions,
    getActiveExtensions,
    getExtensionInfo,
    getExtensionIcon,
    extensionsPath,
  };
}
