// Expo's documented monorepo config (https://docs.expo.dev/guides/monorepos/).
//
// Without this, a transitive dependency like @react-navigation/native (pulled
// in by expo-router) can get hoisted to the workspace root's node_modules,
// where its own `require('react')` resolves to the ROOT copy of React
// instead of this app's local one. Two different React module instances in
// the same render tree breaks hooks outright (e.g. "Cannot read properties
// of null (reading 'useEffect')"). Forcing this app's own node_modules first
// — and disabling Metro's normal upward directory walk — makes every module
// resolve to the same single React instance, regardless of where it lives.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
