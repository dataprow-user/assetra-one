// Expo's documented monorepo config (https://docs.expo.dev/guides/monorepos/).
//
// getDefaultConfig already resolves this app's dependencies correctly now that
// the workspace has a single, de-duplicated copy of every package hoisted to
// the root node_modules. We only add the workspace root to watchFolders so
// Metro picks up changes to shared code outside this app's directory.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...new Set([...(config.watchFolders ?? []), workspaceRoot])];

module.exports = config;
