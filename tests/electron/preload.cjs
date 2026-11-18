'use strict';
// Nur die Testlaufzeit verwendet dieses Preload; Produktionsschnittstelle bleibt unverändert.
localStorage.setItem('uiLang', localStorage.getItem('uiLang') || 'de');
require('../../preload.js');
