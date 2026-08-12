// proxy/html.js

import { encodeURL } from "./utils.js";

export function rewriteHTML(html, baseURL) {

    if (!html) {
        return html;
    }

    console.log(
        "HTML REWRITE START:",
        baseURL
    );


    /*
     * Convert an upstream URL into the local
     * proxy URL.
     */
    function proxyURL(value) {

        if (!value) {
            return value;
        }

        value = value.trim();


        /*
         * Already proxied / special URLs.
         */
        if (
            value.startsWith("/proxy?url=") ||
            value.startsWith("#") ||
            value.startsWith("data:") ||
            value.startsWith("javascript:") ||
            value.startsWith("blob:")
        ) {
            return value;
        }


        /*
         * Protocol-relative URLs.
         */
        if (value.startsWith("//")) {

            try {

                const absolute =
                    new URL(
                        "https:" + value
                    ).href;

                return (
                    "/proxy?url=" +
                    encodeURL(absolute)
                );

            }
            catch (error) {

                return value;

            }

        }


        try {

            const absolute =
                new URL(
                    value,
                    baseURL
                ).href;


            if (
                absolute.startsWith("http://") ||
                absolute.startsWith("https://")
            ) {

                return (
                    "/proxy?url=" +
                    encodeURL(absolute)
                );

            }

        }
        catch (error) {

            console.log(
                "HTML URL ERROR:",
                value,
                error.message
            );

        }


        return value;

    }



    /*
     * Absolute HTTP(S) URLs anywhere inside
     * quoted HTML attributes.
     */
    html =
        html.replace(
            /(["'])(https?:\/\/[^"']+)\1/gi,

            (match, quote, url) => {

                return (
                    quote +
                    proxyURL(url) +
                    quote
                );

            }
        );



    /*
     * Common URL-bearing attributes.
     *
     * Includes:
     *
     * src
     * href
     * action
     * poster
     * data-src
     * data-href
     * data-url
     * content
     */
    html =
        html.replace(
            /(\b(?:src|href|action|poster|data-src|data-href|data-url)=["'])([^"']+)(["'])/gi,

            (match, start, url, end) => {

                return (
                    start +
                    proxyURL(url) +
                    end
                );

            }
        );



    /*
     * srcset handling.
     *
     * Example:
     *
     * image1.jpg 1x,
     * image2.jpg 2x
     *
     * Every source URL is proxied while
     * preserving its descriptor.
     */
    html =
        html.replace(
            /(\bsrcset=["'])([^"']+)(["'])/gi,

            (match, start, value, end) => {

                const output =
                    value
                        .split(",")
                        .map(
                            entry => {

                                const parts =
                                    entry
                                        .trim()
                                        .split(/\s+/);

                                if (
                                    parts.length === 0
                                ) {
                                    return entry;
                                }

                                parts[0] =
                                    proxyURL(
                                        parts[0]
                                    );

                                return parts.join(" ");

                            }
                        )
                        .join(", ");

                return (
                    start +
                    output +
                    end
                );

            }
        );



    /*
     * HTML <link> resources.
     *
     * This catches stylesheet,
     * preload and modulepreload URLs.
     */
    html =
        html.replace(
            /(<link\b[^>]*\bhref=["'])([^"']+)(["'][^>]*>)/gi,

            (match, start, url, end) => {

                return (
                    start +
                    proxyURL(url) +
                    end
                );

            }
        );



    /*
     * HTML <script src=""> resources.
     *
     * These are handled separately so script
     * resources are reliably routed through
     * the proxy.
     */
    html =
        html.replace(
            /(<script\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,

            (match, start, url, end) => {

                return (
                    start +
                    proxyURL(url) +
                    end
                );

            }
        );



    /*
     * HTML <iframe src=""> resources.
     */
    html =
        html.replace(
            /(<iframe\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,

            (match, start, url, end) => {

                return (
                    start +
                    proxyURL(url) +
                    end
                );

            }
        );



    console.log(
        "HTML REWRITE DONE"
    );


    return html;

}
