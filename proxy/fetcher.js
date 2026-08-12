import {
    getOriginCookies,
    setOriginCookies
} from "./session.js";

const BLOCKED_REQUEST_HEADERS = new Set([
    "host",
    "content-length",
    "connection",
    "cookie",
    "transfer-encoding",
    "keep-alive"
]);

const MANAGED_REQUEST_HEADERS = new Set([
    "origin",
    "referer"
]);

function normalizeRequestBody(body) {
    if (body === null || body === undefined) return undefined;
    if (Buffer.isBuffer(body)) return body;
    if (body instanceof Uint8Array) return body;
    if (typeof body === "string") return body;
    if (body instanceof ArrayBuffer) return new Uint8Array(body);

    try {
        return Buffer.from(JSON.stringify(body));
    } catch {
        return undefined;
    }
}

function resolveURL(value, baseURL) {
    if (!value) return null;

    try {
        return new URL(value, baseURL).href;
    } catch {
        return null;
    }
}

function getUpstreamOrigin(url) {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function removeProxySessionCookie(cookieHeader) {
    if (!cookieHeader) return "";

    return cookieHeader
        .split(";")
        .map(part => part.trim())
        .filter(part => {
            if (!part) return false;

            const index = part.indexOf("=");

            if (index <= 0) return false;

            const name = part
                .substring(0, index)
                .trim()
                .toLowerCase();

            return name !== "proxy_session";
        })
        .join("; ");
}

function buildRequestHeaders(
    url,
    clientHeaders = {},
    sessionCookies = "",
    suppliedCookies = ""
) {
    const headers = {};

    for (const key of Object.keys(clientHeaders || {})) {
        const lower = key.toLowerCase();

        if (
            BLOCKED_REQUEST_HEADERS.has(lower) ||
            MANAGED_REQUEST_HEADERS.has(lower)
        ) {
            continue;
        }

        const value = clientHeaders[key];

        if (value === undefined || value === null) {
            continue;
        }

        headers[lower] = Array.isArray(value)
            ? value.join(", ")
            : String(value);
    }

    if (!headers["user-agent"]) {
        headers["user-agent"] =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Safari/537.36";
    }

    const upstreamOrigin = getUpstreamOrigin(url);

    if (upstreamOrigin) {
        headers["origin"] = upstreamOrigin;
    }

    const suppliedReferer =
        clientHeaders?.referer ||
        clientHeaders?.Referer;

    if (suppliedReferer) {
        const resolvedReferer =
            resolveURL(suppliedReferer, url);

        if (resolvedReferer) {
            headers["referer"] = resolvedReferer;
        }
    } else if (upstreamOrigin) {
        headers["referer"] = upstreamOrigin + "/";
    }

    const browserCookies =
        removeProxySessionCookie(suppliedCookies);

    const cookieParts = [];

    if (browserCookies) {
        cookieParts.push(browserCookies);
    }

    if (sessionCookies) {
        cookieParts.push(sessionCookies);
    }

    if (cookieParts.length > 0) {
        headers["cookie"] = cookieParts.join("; ");
    }

    return headers;
}

function getSetCookieHeaders(response) {
    if (
        typeof response.headers.getSetCookie ===
        "function"
    ) {
        return response.headers.getSetCookie();
    }

    const value =
        response.headers.get("set-cookie");

    return value ? [value] : [];
}

function storeResponseCookies(
    sessionId,
    url,
    setCookies
) {
    if (
        !sessionId ||
        !setCookies ||
        setCookies.length === 0
    ) {
        return;
    }

    setOriginCookies(
        sessionId,
        url,
        setCookies
    );

    console.log(
        "FETCHER COOKIES STORED:",
        setCookies.length
    );
}

function collectResponseHeaders(response) {
    const result = {};

    const allowedHeaders = [
        "cache-control",
        "content-disposition",
        "content-language",
        "content-range",
        "etag",
        "last-modified",
        "accept-ranges",
        "vary"
    ];

    for (const name of allowedHeaders) {
        const value =
            response.headers.get(name);

        if (value !== null) {
            result[name] = value;
        }
    }

    return result;
}

export async function fetchWebsite(
    url,
    cookies = "",
    method = "GET",
    body = null,
    clientHeaders = {},
    sessionId = null
) {
    console.log(
        "FETCHER REQUEST:",
        method,
        url
    );

    let sessionCookies = "";

    if (sessionId) {
        sessionCookies =
            getOriginCookies(
                sessionId,
                url
            );
    }

    console.log(
        "UPSTREAM SESSION COOKIES:",
        sessionCookies
            ? "present"
            : "none"
    );

    const headers =
        buildRequestHeaders(
            url,
            clientHeaders,
            sessionCookies,
            cookies
        );

    const requestBody =
        normalizeRequestBody(body);

    const normalizedMethod =
        String(method || "GET").toUpperCase();

    const hasBody =
        requestBody !== undefined &&
        requestBody !== null &&
        normalizedMethod !== "GET" &&
        normalizedMethod !== "HEAD";

    if (
        hasBody &&
        !headers["content-type"]
    ) {
        headers["content-type"] =
            "application/octet-stream";
    }

    let response;

    try {
        response = await fetch(
            url,
            {
                method: normalizedMethod,
                headers,
                body: hasBody
                    ? requestBody
                    : undefined,
                redirect: "manual"
            }
        );
    } catch (error) {
        console.log(
            "FETCH FAILED:",
            error
        );

        return {
            status: 502,
            contentType:
                "text/plain; charset=utf-8",
            body:
                `Upstream fetch failed: ${error.message}`,
            cookies: [],
            location: null,
            headers: {}
        };
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) ||
        "application/octet-stream";

    console.log(
        "FETCH STATUS:",
        response.status,
        contentType
    );

    const setCookies =
        getSetCookieHeaders(response);

    if (setCookies.length > 0) {
        storeResponseCookies(
            sessionId,
            url,
            setCookies
        );
    } else {
        console.log(
            "FETCHER COOKIES STORED:",
            0
        );
    }

    const responseHeaders =
        collectResponseHeaders(response);

    const location =
        response.headers.get("location");

    if (location) {
        console.log(
            "FETCH LOCATION:",
            location
        );
    }

    let buffer;

    try {
        buffer = Buffer.from(
            await response.arrayBuffer()
        );
    } catch (error) {
        console.log(
            "RESPONSE BODY READ FAILED:",
            error
        );

        return {
            status: 502,
            contentType:
                "text/plain; charset=utf-8",
            body:
                "Unable to read upstream response",
            cookies: setCookies,
            location,
            headers: responseHeaders
        };
    }

    console.log(
        "RESPONSE BYTES:",
        buffer.length
    );

    return {
        status: response.status,
        contentType,
        body: buffer,
        cookies: setCookies,
        location,
        headers: responseHeaders
    };
}
