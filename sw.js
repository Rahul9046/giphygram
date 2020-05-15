// SW version
const version = '1.0';

// Static assets - App shell
const appAssets = [
    './index.html',
    './main.js',
    './images/flame.png',
    './images/logo.png',
    './images/sync.png',
    './vendor/bootstrap.min.css',
    './vendor/jquery.min.js'
];

// SW install
self.addEventListener('install', (e)=>{
    e.waitUntil(
        caches.open(`static-${version}`)
            .then(cache => cache.addAll(appAssets))
    );
});

// SW activate
self.addEventListener('activate', (e)=>{
    // clean static cache
    let cleaned= caches.keys().then((keys)=>{
        keys.forEach((key)=>{
            if ((key !== `static-${version}`) && key.match('static-')){
                return caches.delete(key);
            }
        });
    })
    e.waitUntil(cleaned);
});

// Static cache strategy - cache with network fallback
const staticCache = (request, cacheName = `static-${version}`) => {
    return caches.match(request).then((cacheRes) => {
        if (cacheRes){
            return cacheRes;
        }
        return fetch(request).then((networkRes)=>{
            // Update cache with the new response
            caches.open(cacheName).then((cache) => {
                cache.put(request, networkRes);
            });
            // return clone of the network response
            return networkRes.clone();
        });
    });
}

// Network with cache fallback
const fallbackCache = (req)=>{
    // Try network 
    return fetch(req).then((networkRes) => {
        // check if the response if ok, else go to the cache
        if (!networkRes.ok){
            throw 'Fetch Error'
        }
        // update cache with the new data
        caches.open(`static-${version}`)
            .then(cache => cache.put(req, networkRes));

        // return a clone version of the response 
        return networkRes.clone();
    }).catch(err => caches.match(req));
}

// Clean old giphys from the giphy cache
const cleanGiphyCache = (giphys)=>{
    caches.open('giphy')
        // get all cache entries
        .then(cache => {
            cache.keys().then((keys) => {
                keys.forEach((key) => {
                    // if not part of current giphys, delete it
                    if (!giphys.includes(key.url)){
                        cache.delete(key);
                    }
                });
            })
        })
}

// SW fetch
self.addEventListener('fetch', (e)=>{
    // App shell
    if (e.request.url.match(location.origin)){
        e.respondWith(staticCache(e.request));

    // Giphy API 
    } else if(e.request.url.match('api.giphy.com/v1/gifs/trending')){
        e.respondWith(fallbackCache(e.request));

    // Giphy media    
    } else if (e.request.url.match('giphy.com/media')){
        e.respondWith(staticCache(e.request, 'giphy'))
    }
})

// Listen for message from the client
self.addEventListener('message', (e)=>{
    // Identify the message
    if (e.data.action === 'cleanGiphyCache'){
        cleanGiphyCache(e.data.giphys);
    }
})