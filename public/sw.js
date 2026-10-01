// OmniLifeOS Service Worker & Notification Handler
// Supports background notifications, FCM push payload delivery, and notification action clicks

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push / FCM notifications
self.addEventListener('push', event => {
  let data = {
    title: '⏰ Task Reminder',
    body: 'You have a scheduled task due now in OmniLifeOS.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'omnilifeos-task-alert',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
        data.icon = payload.notification.icon || data.icon;
      } else if (payload.title) {
        data = { ...data, ...payload };
      }
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || 'omnilifeos-task-alert',
    renotify: true,
    requireInteraction: true, // Keeps alert visible until acted upon
    vibrate: [300, 150, 300, 150, 400],
    data: data.data || {},
    actions: [
      { action: 'open', title: '👀 View Task' },
      { action: 'snooze', title: '⏱ Snooze 5m' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle Notification Clicks (Focus app or handle snooze/open)
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const taskId = event.notification.data?.taskId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a client window is already open, focus it and post a message
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (action === 'snooze') {
            client.postMessage({ type: 'NOTIFICATION_ACTION_SNOOZE', taskId });
          } else if (action === 'complete') {
            client.postMessage({ type: 'NOTIFICATION_ACTION_COMPLETE', taskId });
          }
          return;
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
