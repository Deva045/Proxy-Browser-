import { encodeURL } from "./utils.js";

export function rewriteJS(js, baseURL) {
    if (!js) {
        return js;
    }

    console.log("REWRITING JS:", baseURL);

    function isProxyURL(value) {
        if (!value) {
            return false;
        }

        const trimmed = value.trim();
        return trimmed.startsWith("/proxy?url=") || trimmed.includes("/proxy?url=");
    }

    function rewriteURL(value) {
        try {
            if (!value) {
                return value;
            }

            const trimmed = value.trim();
            if (!trimmed || isProxyURL(trimmed)) {
                return value;
            }

            if (
                trimmed.startsWith("#") ||
                trimmed.startsWith("javascript:") ||
                trimmed.startsWith("data:") ||
                trimmed.startsWith("mailto:") ||
                trimmed.startsWith("blob:")
            ) {
                return value;
            }

            const absolute = new URL(trimmed, baseURL || "http://localhost").href;
            if (absolute.startsWith("http://") || absolute.startsWith("https://")) {
                return "/proxy?url=" + encodeURL(absolute);
            }

            return value;
        } catch (error) {
            return value;
        }
    }

    js = js.replace(/(\bfetch\s*\(\s*)(["'])([^"']*)\2/g, (match, prefix, quote, value) => {
        return `${prefix}${quote}${rewriteURL(value)}${quote}`;
    });

    js = js.replace(/(\bnew\s+Request\s*\(\s*)(["'])([^"']*)\2/g, (match, prefix, quote, value) => {
        return `${prefix}${quote}${rewriteURL(value)}${quote}`;
    });

    js = js.replace(/(\.open\s*\(\s*["'][^"']*["']\s*,\s*)(["'])([^"']*)\2/g, (match, prefix, quote, value) => {
        return `${prefix}${quote}${rewriteURL(value)}${quote}`;
    });

    js = js.replace(/(\bsendBeacon\s*\(\s*)(["'])([^"']*)\2/g, (match, prefix, quote, value) => {
        return `${prefix}${quote}${rewriteURL(value)}${quote}`;
    });

    console.log("JS REWRITE DONE");
    return js;
}
