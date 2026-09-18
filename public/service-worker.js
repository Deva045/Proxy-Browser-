/*
 * ============================================================
 * PROXY BROWSER — SERVICE WORKER
 * ============================================================
 *
 * The application runs on the Proxy Browser origin.
 *
 * Instagram pages can request resources from external Instagram
 * and CDN hosts. Those requests would otherwise leave the proxy
 * origin and be subject to normal browser cross-origin rules.
 *
 * This worker redirects supported cross-origin GET/HEAD requests
 * through the existing Proxy Browser endpoint:
 *
 *     /proxy?url=<base64url>
 *
 * The encoding format intentionally matches:
 *
 *     public/proxy.js
 *     proxy/utils.js
 *
 * IMPORTANT:
 * - Requests already going through /proxy are untouched.
 * - Requests to the Proxy Browser origin are untouched.
 * - Non-supported hosts are untouched.
 * - Only GET and HEAD requests are intercepted.
 * - The server remains responsible for cookies, headers,
 *   upstream fetching, resource processing, and rewriting.
 */


/* ============================================================
 * CONFIGURATION
 * ============================================================ */

const PROXY_PATH = "/proxy?url=";


/*
 * Hosts that are currently required by Instagram.
 *
 * Keep this allow-list explicit. Do not proxy arbitrary
 * cross-origin requests.
 */

const HOST_PATTERNS = [
    /(^|\.)instagram\.com$/i,
    /(^|\.)cdninstagram\.com$/i,
    /(^|\.)static\.cdninstagram\.com$/i,
    /(^|\.)graph\.instagram\.com$/i,
    /(^|\.)i\.instagram\.com$/i,
    /(^|\.)l\.instagram\.com$/i,

    /*
     * Instagram media hosts.
     *
     * Examples:
     *   scontent-ord5-3.cdninstagram.com
     *   scontent.xx.fbcdn.net
     */
    /^scontent-[^.]+\.cdninstagram\.com$/i,

    /*
     * Facebook CDN hosts can be used for Instagram media.
     *
     * Keep fbcdn.net rather than the much broader
     * facebook.com domain.
     */
    /(^|\.)fbcdn\.net$/i
];


/* ============================================================
 * URL HELPERS
 * ============================================================ */


/**
 * Determine whether an upstream hostname is supported.
 *
 * @param {string} hostname
 * @returns {boolean}
 */

function isSupportedHost(hostname) {

    if (!hostname) {
        return false;
    }

    const host =
        hostname.toLowerCase();

    return HOST_PATTERNS.some(
        pattern => pattern.test(host)
    );
}


/**
 * Determine whether a request already targets our proxy route.
 *
 * @param {string} requestURL
 * @returns {boolean}
 */

function isProxyRequest(requestURL) {

    try {

        const parsed =
            new URL(requestURL);

        return (
            parsed.origin === self.location.origin &&
            parsed.pathname === "/proxy"
        );

    }
    catch {

        return false;

    }

}


/**
 * Encode a URL using the same Base64URL format as the project.
 *
 * This intentionally matches:
 *
 *     public/proxy.js -> encodeURL()
 *     proxy/utils.js  -> encodeURL()
 *
 * @param {string} url
 * @returns {string}
 */

function encodeURL(url) {

    if (!url) {
        return "";
    }

    /*
     * TextEncoder makes this safe for URLs containing Unicode
     * characters. Normal Instagram URLs are ASCII, but this keeps
     * the helper robust.
     */

    const bytes =
        new TextEncoder().encode(url);

    let binary = "";

    const chunkSize = 0x8000;

    for (
        let offset = 0;
        offset < bytes.length;
        offset += chunkSize
    ) {

        const chunk =
            bytes.subarray(
                offset,
                Math.min(
                    offset + chunkSize,
                    bytes.length
                )
            );

        binary +=
            String.fromCharCode(
                ...chunk
            );

    }

    return btoa(binary)
    .split("+").join("-")
    .split("/").join("_")
    .replace(/=/g, "");
}


/**
 * Create the existing Proxy Browser proxy URL.
 *
 * @param {string} upstreamURL
 * @returns {string}
 */

function createProxyURL(upstreamURL) {

    return (
        PROXY_PATH +
        encodeURL(upstreamURL)
    );

}


/* ============================================================
 * REQUEST FILTER
 * ============================================================ */


/**
 * Determine whether a request should be intercepted.
 *
 * The service worker intentionally handles only GET and HEAD.
 * The existing server/fetcher remains responsible for normal
 * application requests and request bodies.
 *
 * @param {Request} request
 * @returns {boolean}
 */

function shouldProxyRequest(request) {

    try {

        /*
         * Only GET and HEAD are intercepted.
         *
         * This avoids consuming arbitrary POST/PUT/PATCH request
         * bodies inside the service worker.
         */

        if (
            request.method !== "GET" &&
            request.method !== "HEAD"
        ) {

            return false;

        }


        const url =
            new URL(request.url);


        /*
         * Only HTTP(S) resources are relevant.
         */

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {

            return false;

        }


        /*
         * Never intercept our own proxy endpoint.
         */

        if (
            isProxyRequest(
                request.url
            )
        ) {

            return false;

        }


        /*
         * Only intercept supported upstream hosts.
         */

        return isSupportedHost(
            url.hostname
        );

    }
    catch {

        return false;

    }

}


/* ============================================================
 * INSTALL
 * ============================================================ */

self.addEventListener(
    "install",
    event => {

        /*
         * Activate the new worker immediately.
         */

        event.waitUntil(
            self.skipWaiting()
        );

    }
);


/* ============================================================
 * ACTIVATE
 * ============================================================ */

self.addEventListener(
    "activate",
    event => {

        /*
         * Take control of existing clients immediately.
         */

        event.waitUntil(
            self.clients.claim()
        );

    }
);


/* ============================================================
 * FETCH INTERCEPTION
 * ============================================================ */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        if (
            !shouldProxyRequest(
                request
            )
        ) {

            return;

        }


        const upstreamURL =
            request.url;


        const proxiedURL =
            createProxyURL(
                upstreamURL
            );


        console.debug(
            "[Proxy SW]",
            request.method,
            upstreamURL,
            "=>",
            proxiedURL
        );


        /*
         * The proxy endpoint is same-origin with the service worker,
         * so the browser can request it normally.
         *
         * We deliberately do not copy the original cross-origin
         * Request object. The server-side fetcher is responsible
         * for constructing the upstream request.
         */

        event.respondWith(
            fetch(
                proxiedURL,
                {
                    method: request.method,
                    credentials: "same-origin",
                    redirect: "follow"
                }
            )
        );

    }
);


/* ============================================================
 * MESSAGE CHANNEL
 * ============================================================ */

self.addEventListener(
    "message",
    event => {

        if (
            event.data &&
            event.data.type ===
                "PROXY_SW_PING"
        ) {

            event.source?.postMessage({

                type:
                    "PROXY_SW_PONG",

                controlled:
                    true,

                scope:
                    self.registration.scope

            });

        }

    }
);
