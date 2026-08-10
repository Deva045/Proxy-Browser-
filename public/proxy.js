export function encodeURL(url) {
    if (!url) {
        return "";
    }

    return btoa(url)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

export function decodeURL(data) {
    if (!data) {
        return "";
    }

    let normalized = String(data)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (normalized.length % 4) {
        normalized += "=";
    }

    try {
        return atob(normalized);
    } catch (error) {
        return "";
    }
}

export function createProxyURL(url) {
    if (!url || url === "about:blank") {
        return "about:blank";
    }

    return "/proxy?url=" + encodeURL(url);
}

export function decodeProxyURL(value) {
    if (!value) {
        return "";
    }

    try {
        const parsed = new URL(value, window.location.href);
        if (parsed.pathname === "/proxy" && parsed.searchParams.get("url")) {
            return decodeURL(parsed.searchParams.get("url"));
        }
    } catch (error) {
        // fall back to the raw value
    }

    return value;
}
