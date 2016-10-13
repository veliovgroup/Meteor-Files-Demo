Package.describe({
  name: 'ostrio:cstorage',
  version: '2.1.0',
  summary: 'Bulletproof persistent Client storage, works with disabled Cookies and/or localStorage',
  git: 'https://github.com/VeliovGroup/Client-Storage',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4');
  api.use('ecmascript', 'client');
  api.mainModule('cstorage.js', 'client');
  api.export('ClientStorage', 'client');
  api.export('clientStorage', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use(['ecmascript', 'ostrio:cstorage'], 'client');
  api.addFiles('client-storage-tests.js', 'client');
});

Npm.depends({
  'ClientStorage': '2.1.0'
});