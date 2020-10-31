import { shell, remote } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { observable } from 'mobx';
import webstore from 'chrome-webstore';
import unzip from 'extract-zip';

import getPlatformInfo from './platformInfo';
import openCRXasZip from './crxToZip';

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
    const noIcon = './assets/images/no-extension-icon.png';

    if (!info.icons) {
      return noIcon;
    }

    // Find largest icon
    let largestSize = -1;
    for (const size in info.icons) {
      if (size > largestSize) {
        largestSize = size;
      }
    }

    if (largestSize === -1) {
      return noIcon;
    }

    return path.join(extensionsPath, key, info.icons[largestSize]);
  };
  const openExtensionFolder = (key) => {
    const filePath = path.join(extensionsPath, key);
    shell.showItemInFolder(filePath);
  };
  const deleteExtension = async (key, openSettings = true) => {
    const filePath = path.join(extensionsPath, key);
    await fs.remove(filePath);

    if (openSettings) {
      window.ferdi.stores.router.history.push('/settings/extensions');
    }
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


  /**
   * Install a new Chrome extension from the Chrome webstore
   *
   * @param String id Extension ID
   */
  const installChromeExtension = id => new Promise(async (resolve, reject) => {
    // Check if extension is already installed
    if (activeExtensions.includes(id)) {
      resolve();
      return;
    }

    // Download CRX from the webstore
    const apiVersion = await webstore.version();

    const platformInfo = getPlatformInfo();

    // Source: https://github.com/Rob--W/crxviewer/blob/master/src/cws_pattern.js#L128
    let url = 'https://clients2.google.com/service/update2/crx?response=redirect';
    url += `&os=${platformInfo.os}`;
    url += `&arch=${platformInfo.arch}`;
    url += `&os_arch=${platformInfo.arch}`; // crbug.com/709147 - should be archName of chrome.system.cpu.getInfo
    url += `&nacl_arch=${platformInfo.nacl_arch}`;
    url += '&prod=chromiumcrx';
    url += '&prodchannel=unknown';
    url += `&prodversion=${apiVersion}`;
    url += '&acceptformat=crx2,crx3';
    url += `&x=id%3D${id}`;
    url += '%26uc';

    const zipPath = path.join(extensionsPath, `${id}.zip`);
    const unpackedPath = path.join(extensionsPath, id);

    try {
      openCRXasZip(url, async (buffer) => {
        // Sucessfully got ZIP
        fs.writeFileSync(zipPath, buffer);

        // Unpack the ZIP file to the final folder
        await unzip(zipPath, { dir: unpackedPath });

        // Load our new extension
        loadExtension(id);

        resolve();
      }, (msg) => {
        // Error
        console.error("Can't download extension: ", msg);
        reject();
      }, () => {});
    } catch (e) {
      console.log('Error:', e);
      reject();
    }
  });

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
    openExtensionFolder,
    installChromeExtension,
    deleteExtension,
    extensionsPath,
  };
}
