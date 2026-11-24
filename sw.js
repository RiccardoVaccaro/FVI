// Service worker minimo: rende l'app installabile e tiene in cache la "cornice"
// (la parte con i dati arriva sempre da Apps Script).
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

var CACHE = 'falco-vi-v4';
var FILE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }));
  self.clients.claim();
});

// Prima la rete (così gli aggiornamenti arrivano subito), poi la cache se offline.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});

// Notifiche push (Firebase Cloud Messaging): messaggi "data", la notifica la mostriamo noi.
firebase.initializeApp({
  apiKey: 'AIzaSyD1dj_0myugLL1_1OZ0sR00kQS_RclAXsw',
  authDomain: 'falco-vi.firebaseapp.com',
  projectId: 'falco-vi',
  storageBucket: 'falco-vi.firebasestorage.app',
  messagingSenderId: '374942422043',
  appId: '1:374942422043:web:d431ea7104796c3f92d4be'
});
firebase.messaging().onBackgroundMessage(function (p) {
  var d = p.data || {};
  return self.registration.showNotification(d.titolo || 'FALCO VI', {
    body: d.testo || '', icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', data: {link: d.link || './'}
  });
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var link = (e.notification.data && e.notification.data.link) || './';
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(function (l) {
    for (var i = 0; i < l.length; i++) if ('focus' in l[i]) return l[i].focus();
    return clients.openWindow(link);
  }));
});
