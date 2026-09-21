const CACHE_NAME = 'dosje-inspector-v2';
const STATIC_URLS = [
    '/dashboard/inspector/',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    if (event.request.url.includes('/api/')) {
        return; // Let the browser handle API requests natively
    }

    event.respondWith(
        fetch(event.request)
        .then(res => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
            return res;
        })
        .catch(() => caches.match(event.request))
    );
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-reports') {
        event.waitUntil(syncReports());
    }
});

async function syncReports() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('DosjeOfflineStore', 3);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('inspections_cache')) db.createObjectStore('inspections_cache', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
        };
        req.onsuccess = async (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('outbox')) {
                return resolve();
            }
            
            const tx = db.transaction('outbox', 'readwrite');
            const store = tx.objectStore('outbox');
            const allReq = store.getAll();
            
            allReq.onsuccess = async () => {
                const reports = allReq.result;
                let failedCount = 0;
                
                for (let r of reports) {
                    try {
                        const formData = new FormData();
                        
                        if (r.payload) {
                            for (let key in r.payload) {
                                formData.append(key, r.payload[key]);
                            }
                        }
                        
                        if (r.files) {
                            for (let key in r.files) {
                                const f = r.files[key];
                                if (f instanceof Blob || f instanceof File) {
                                    formData.append(key, f, f.name || 'upload.jpg');
                                }
                            }
                        }
                        
                        if (!formData.has('client_submission_id')) {
                            formData.append('client_submission_id', r.id);
                        }

                        // We don't have token in SW, but we attempt.
                        // If it fails 401, the UI manual sync will handle it with token.
                        const res = await fetch('/api/reports/', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (res.ok) {
                            const dTx = db.transaction('outbox', 'readwrite');
                            dTx.objectStore('outbox').delete(r.id);
                        } else {
                            failedCount++;
                            const uTx = db.transaction('outbox', 'readwrite');
                            r.retryCount = (r.retryCount || 0) + 1;
                            uTx.objectStore('outbox').put(r);
                        }
                    } catch (err) {
                        failedCount++;
                        const uTx = db.transaction('outbox', 'readwrite');
                        r.retryCount = (r.retryCount || 0) + 1;
                        uTx.objectStore('outbox').put(r);
                    }
                }
                
                if (failedCount > 0) reject('Some reports failed to sync');
                else resolve();
            };
        };
        req.onerror = () => reject(req.error);
    });
}
