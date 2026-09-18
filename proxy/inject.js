export function injectProxyScript(html, originalURL) {

    if (!html) {
        return html;
    }

    const script = `
<script>
(function () {

    "use strict";

    /*
     * ============================================================
     * PROXY BROWSER — PROXY RUNTIME
     * ============================================================
     *
     * The page is displayed from the Proxy Browser origin while
     * resources are normally requested from the original upstream
     * origin.
     *
     * This runtime keeps browser-generated requests inside:
     *
     *     /proxy?url=<encoded upstream URL>
     *
     * It intentionally does not rewrite arbitrary URLs. Only the
     * upstream origins that belong to the proxied application are
     * intercepted.
     */


    const ORIGINAL_PAGE_URL =
        ${JSON.stringify(originalURL)};


    const PROXY_ORIGIN =
        window.location.origin;


    const ORIGINAL_PAGE_BASE =
        new URL(ORIGINAL_PAGE_URL);


    console.log(
        "PROXY INJECT ACTIVE:",
        ORIGINAL_PAGE_URL
    );


    /*
     * ============================================================
     * UPSTREAM HOST MATCHING
     * ============================================================
     */

    function isInstagramHost(hostname) {

        const host =
            String(hostname || "")
                .toLowerCase()
                .replace(/\.$/, "");


        if (
            host === "instagram.com" ||
            host.endsWith(".instagram.com")
        ) {
            return true;
        }


        if (
            host === "cdninstagram.com" ||
            host.endsWith(".cdninstagram.com")
        ) {
            return true;
        }


        if (
            host === "graph.instagram.com" ||
            host === "i.instagram.com" ||
            host === "l.instagram.com"
        ) {
            return true;
        }


        if (
            host === "fbcdn.net" ||
            host.endsWith(".fbcdn.net")
        ) {
            return true;
        }


        if (
            host === "facebook.com" ||
            host.endsWith(".facebook.com")
        ) {
            return true;
        }


        return false;

    }


    /*
     * ============================================================
     * URL ENCODING
     * ============================================================
     */

    function encodeProxyURL(url) {

        try {

            const bytes =
                new TextEncoder().encode(url);


            let binary = "";


            for (
                let i = 0;
                i < bytes.length;
                i++
            ) {

                binary += String.fromCharCode(
                    bytes[i]
                );

            }


            return btoa(binary)
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");

        }
        catch (error) {

            console.error(
                "PROXY ENCODE ERROR:",
                error
            );

            return null;

        }

    }


    /*
     * ============================================================
     * RESOLVE UPSTREAM URL
     * ============================================================
     *
     * Relative URLs are resolved against the ORIGINAL upstream
     * document URL, not against the proxy origin.
     */

    function resolveURL(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return value;

        }


        if (
            typeof value !== "string"
        ) {

            return value;

        }


        const trimmed =
            value.trim();


        if (!trimmed) {

            return value;

        }


        if (
            trimmed.startsWith("data:") ||
            trimmed.startsWith("blob:") ||
            trimmed.startsWith("javascript:") ||
            trimmed.startsWith("#")
        ) {

            return value;

        }


        try {

            return new URL(
                trimmed,
                ORIGINAL_PAGE_BASE
            ).href;

        }
        catch (error) {

            console.warn(
                "PROXY URL RESOLVE FAILED:",
                value,
                error
            );

            return value;

        }

    }


    /*
     * ============================================================
     * SHOULD PROXY
     * ============================================================
     */

    function shouldProxyURL(url) {

        try {

            const parsed =
                new URL(
                    url,
                    ORIGINAL_PAGE_BASE
                );


            if (
                parsed.protocol !== "http:" &&
                parsed.protocol !== "https:"
            ) {

                return false;

            }


            return isInstagramHost(
                parsed.hostname
            );

        }
        catch (error) {

            return false;

        }

    }


    /*
     * ============================================================
     * CREATE PROXY URL
     * ============================================================
     */

    function proxyURL(url) {

        if (
            !shouldProxyURL(url)
        ) {

            return url;

        }


        const encoded =
            encodeProxyURL(url);


        if (!encoded) {

            return url;

        }


        const proxied =
            PROXY_ORIGIN +
            "/proxy?url=" +
            encoded;


        console.log(
            "PROXY URL:",
            url,
            "=>",
            proxied
        );


        return proxied;

    }


    /*
     * ============================================================
     * SERVICE WORKER REGISTRATION
     * ============================================================
     */

    function registerServiceWorker() {

        if (
            !("serviceWorker" in navigator)
        ) {

            console.warn(
                "SERVICE WORKER NOT SUPPORTED"
            );

            return;

        }


        navigator.serviceWorker
            .register(
                "/service-worker.js",
                {
                    scope: "/"
                }
            )
            .then(
                function (registration) {

                    console.log(
                        "PROXY SERVICE WORKER REGISTERED:",
                        registration.scope
                    );

                }
            )
            .catch(
                function (error) {

                    console.error(
                        "PROXY SERVICE WORKER REGISTRATION FAILED:",
                        error
                    );

                }
            );

    }


    registerServiceWorker();


    /*
     * ============================================================
     * FETCH HOOK
     * ============================================================
     */

    const originalFetch =
        window.fetch;


    window.fetch =
        function (
            input,
            init
        ) {

            try {

                let requestURL = null;


                if (
                    typeof input === "string"
                ) {

                    requestURL =
                        input;

                }
                else if (
                    input &&
                    typeof input.url === "string"
                ) {

                    requestURL =
                        input.url;

                }


                const resolved =
                    resolveURL(requestURL);


                if (
                    resolved &&
                    shouldProxyURL(resolved)
                ) {

                    const proxied =
                        proxyURL(resolved);


                    console.log(
                        "FETCH INTERCEPT:",
                        requestURL,
                        "=>",
                        resolved,
                        "=>",
                        proxied
                    );


                    /*
                     * Request objects must remain Requests so
                     * credentials, method, headers, signal, etc.
                     * continue to behave normally.
                     */

                    if (
                        typeof Request !== "undefined" &&
                        input instanceof Request
                    ) {

                        const request =
                            new Request(
                                proxied,
                                input
                            );


                        return originalFetch.call(
                            this,
                            request,
                            init
                        );

                    }


                    input =
                        proxied;

                }

            }
            catch (error) {

                console.error(
                    "FETCH PROXY ERROR:",
                    error
                );

            }


            return originalFetch.call(
                this,
                input,
                init
            );

        };


    /*
     * ============================================================
     * XHR HOOK
     * ============================================================
     */

    const originalOpen =
        XMLHttpRequest.prototype.open;


    XMLHttpRequest.prototype.open =
        function (
            method,
            url,
            async,
            user,
            password
        ) {

            try {

                const resolved =
                    resolveURL(url);


                if (
                    resolved &&
                    shouldProxyURL(resolved)
                ) {

                    const proxied =
                        proxyURL(resolved);


                    console.log(
                        "XHR INTERCEPT:",
                        method,
                        url,
                        "=>",
                        proxied
                    );


                    url =
                        proxied;

                }

            }
            catch (error) {

                console.error(
                    "XHR PROXY ERROR:",
                    error
                );

            }


            return originalOpen.call(
                this,
                method,
                url,
                async,
                user,
                password
            );

        };


    /*
     * ============================================================
     * EVENTSOURCE HOOK
     * ============================================================
     */

    if (
        typeof window.EventSource === "function"
    ) {

        const OriginalEventSource =
            window.EventSource;


        window.EventSource =
            function (
                url,
                eventSourceInitDict
            ) {

                try {

                    const resolved =
                        resolveURL(url);


                    if (
                        resolved &&
                        shouldProxyURL(resolved)
                    ) {

                        const proxied =
                            proxyURL(resolved);


                        console.log(
                            "EVENTSOURCE INTERCEPT:",
                            url,
                            "=>",
                            proxied
                        );


                        url =
                            proxied;

                    }

                }
                catch (error) {

                    console.error(
                        "EVENTSOURCE PROXY ERROR:",
                        error
                    );

                }


                return new OriginalEventSource(
                    url,
                    eventSourceInitDict
                );

            };


        window.EventSource.prototype =
            OriginalEventSource.prototype;


        try {

            Object.defineProperty(
                window.EventSource,
                "CONNECTING",
                {
                    value:
                        OriginalEventSource.CONNECTING
                }
            );


            Object.defineProperty(
                window.EventSource,
                "OPEN",
                {
                    value:
                        OriginalEventSource.OPEN
                }
            );


            Object.defineProperty(
                window.EventSource,
                "CLOSED",
                {
                    value:
                        OriginalEventSource.CLOSED
                }
            );

        }
        catch (error) {

            console.warn(
                "EVENTSOURCE CONSTANT COPY FAILED:",
                error
            );

        }

    }


    /*
     * ============================================================
     * SEND BEACON HOOK
     * ============================================================
     */

    if (
        navigator.sendBeacon
    ) {

        const originalSendBeacon =
            navigator.sendBeacon.bind(navigator);


        navigator.sendBeacon =
            function (
                url,
                data
            ) {

                try {

                    const resolved =
                        resolveURL(url);


                    if (
                        resolved &&
                        shouldProxyURL(resolved)
                    ) {

                        const proxied =
                            proxyURL(resolved);


                        console.log(
                            "SEND BEACON INTERCEPT:",
                            url,
                            "=>",
                            proxied
                        );


                        url =
                            proxied;

                    }

                }
                catch (error) {

                    console.error(
                        "SEND BEACON PROXY ERROR:",
                        error
                    );

                }


                return originalSendBeacon(
                    url,
                    data
                );

            };

    }


    /*
     * ============================================================
     * IMAGE SRC HOOK
     * ============================================================
     *
     * Some applications bypass fetch/XHR completely by assigning
     * URLs directly to Image objects.
     */

    try {

        const imageSrcDescriptor =
            Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                "src"
            );


        if (
            imageSrcDescriptor &&
            imageSrcDescriptor.set &&
            imageSrcDescriptor.get
        ) {

            Object.defineProperty(
                HTMLImageElement.prototype,
                "src",
                {
                    configurable:
                        imageSrcDescriptor.configurable,

                    enumerable:
                        imageSrcDescriptor.enumerable,

                    get:
                        function () {

                            return imageSrcDescriptor
                                .get
                                .call(this);

                        },

                    set:
                        function (value) {

                            try {

                                const resolved =
                                    resolveURL(value);


                                if (
                                    resolved &&
                                    shouldProxyURL(resolved)
                                ) {

                                    const proxied =
                                        proxyURL(resolved);


                                    console.log(
                                        "IMAGE SRC INTERCEPT:",
                                        value,
                                        "=>",
                                        proxied
                                    );


                                    value =
                                        proxied;

                                }

                            }
                            catch (error) {

                                console.error(
                                    "IMAGE SRC PROXY ERROR:",
                                    error
                                );

                            }


                            return imageSrcDescriptor
                                .set
                                .call(this, value);

                        }

                }
            );

        }

    }
    catch (error) {

        console.warn(
            "IMAGE SRC HOOK FAILED:",
            error
        );

    }


    /*
     * ============================================================
     * IMAGE SETATTRIBUTE HOOK
     * ============================================================
     *
     * Covers code such as:
     *
     *     image.setAttribute("src", url)
     */

    const originalSetAttribute =
        Element.prototype.setAttribute;


    Element.prototype.setAttribute =
        function (
            name,
            value
        ) {

            try {

                if (
                    this instanceof HTMLImageElement &&
                    String(name).toLowerCase() === "src"
                ) {

                    const resolved =
                        resolveURL(value);


                    if (
                        resolved &&
                        shouldProxyURL(resolved)
                    ) {

                        value =
                            proxyURL(resolved);


                        console.log(
                            "IMAGE ATTRIBUTE INTERCEPT:",
                            value
                        );

                    }

                }

            }
            catch (error) {

                console.error(
                    "IMAGE ATTRIBUTE PROXY ERROR:",
                    error
                );

            }


            return originalSetAttribute.call(
                this,
                name,
                value
            );

        };


    /*
     * ============================================================
     * WEBSOCKET HOOK
     * ============================================================
     *
     * The server exposes:
     *
     *     /ws?url=<upstream websocket URL>
     *
     * therefore WebSocket URLs are converted to the local proxy
     * WebSocket endpoint.
     */

    const OriginalWebSocket =
        window.WebSocket;


    if (
        typeof OriginalWebSocket === "function"
    ) {

        window.WebSocket =
            function (
                url,
                protocols
            ) {

                try {

                    const parsed =
                        new URL(
                            url,
                            ORIGINAL_PAGE_BASE
                        );


                    const isWebSocket =
                        parsed.protocol === "ws:" ||
                        parsed.protocol === "wss:";


                    if (
                        isWebSocket &&
                        isInstagramHost(
                            parsed.hostname
                        )
                    ) {

                        const upstreamURL =
                            parsed.href;


                        const encoded =
                            encodeProxyURL(
                                upstreamURL
                            );


                        if (encoded) {

                            const proxyWebSocketURL =
                                (
                                    window.location.protocol ===
                                    "https:"
                                )
                                    ? "wss://"
                                    : "ws://";


                            url =
                                proxyWebSocketURL +
                                window.location.host +
                                "/ws?url=" +
                                encoded;


                            console.log(
                                "WEBSOCKET INTERCEPT:",
                                upstreamURL,
                                "=>",
                                url
                            );

                        }

                    }

                }
                catch (error) {

                    console.error(
                        "WEBSOCKET PROXY ERROR:",
                        error
                    );

                }


                if (
                    arguments.length > 1
                ) {

                    return new OriginalWebSocket(
                        url,
                        protocols
                    );

                }


                return new OriginalWebSocket(
                    url
                );

            };


        window.WebSocket.prototype =
            OriginalWebSocket.prototype;


        try {

            Object.defineProperty(
                window.WebSocket,
                "CONNECTING",
                {
                    value:
                        OriginalWebSocket.CONNECTING
                }
            );


            Object.defineProperty(
                window.WebSocket,
                "OPEN",
                {
                    value:
                        OriginalWebSocket.OPEN
                }
            );


            Object.defineProperty(
                window.WebSocket,
                "CLOSING",
                {
                    value:
                        OriginalWebSocket.CLOSING
                }
            );


            Object.defineProperty(
                window.WebSocket,
                "CLOSED",
                {
                    value:
                        OriginalWebSocket.CLOSED
                }
            );

        }
        catch (error) {

            console.warn(
                "WEBSOCKET CONSTANT COPY FAILED:",
                error
            );

        }

    }


    /*
     * ============================================================
     * DEBUGGING
     * ============================================================
     */

    window.__PROXY_BROWSER__ = {

        originalURL:
            ORIGINAL_PAGE_URL,

        proxyOrigin:
            PROXY_ORIGIN,

        resolveURL,

        shouldProxyURL,

        proxyURL,

        encodeProxyURL

    };


    console.log(
        "PROXY HOOKS READY:",
        ORIGINAL_PAGE_URL
    );


})();
</script>
`;


    /*
     * ============================================================
     * HTML INJECTION
     * ============================================================
     */

    if (
        /<head\b[^>]*>/i.test(html)
    ) {

        return html.replace(
            /(<head\b[^>]*>)/i,
            "$1" + script
        );

    }


    if (
        /<script\b/i.test(html)
    ) {

        return html.replace(
            /(<script\b)/i,
            script + "$1"
        );

    }


    return (
        script +
        html
    );

}