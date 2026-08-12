import { rewriteHTML } from "./html.js";
import { injectProxyScript } from "./inject.js";


function isAPIRequest(url) {

    try {

        const parsed =
            new URL(url);


        return (
            parsed.pathname.startsWith("/ajax/") ||
            parsed.pathname.startsWith("/api/") ||
            parsed.pathname.startsWith("/graphql")
        );

    }
    catch {

        return false;

    }

}


export function processResource(
    body,
    contentType,
    url
) {

    if (
        body === null ||
        body === undefined
    ) {

        return body;

    }


    console.log(
        "PROCESS RESOURCE:",
        contentType,
        url
    );


    const type =
        (
            contentType ||
            ""
        )
        .toLowerCase();


    /*
     * ============================================================
     * API / XHR RESPONSES
     * ============================================================
     *
     * Never HTML-rewrite API responses.
     *
     * Instagram can return AJAX responses with
     * text/html even though they are data responses.
     */

    if (
        isAPIRequest(url)
    ) {

        console.log(
            "API RESPONSE PASSED THROUGH:",
            url
        );


        return body;

    }


    /*
     * ============================================================
     * HTML DOCUMENT
     * ============================================================
     */

    if (
        type.includes("text/html")
    ) {

        let html =
            Buffer.isBuffer(body)
                ? body.toString("utf8")
                : String(body);


        console.log(
            "HTML REWRITE RUNNING:",
            url
        );


        html =
            rewriteHTML(
                html,
                url
            );


        html =
            injectProxyScript(
                html,
                url
            );


        console.log(
            "INJECT SUCCESS:",
            url
        );


        return html;

    }


    /*
     * ============================================================
     * JAVASCRIPT
     * ============================================================
     */

    if (
        type.includes("javascript") ||
        type.includes("ecmascript") ||
        type.includes("x-javascript")
    ) {

        console.log(
            "JS PASSED THROUGH:",
            url
        );


        return body;

    }


    /*
     * ============================================================
     * CSS
     * ============================================================
     */

    if (
        type.includes("text/css") ||
        type.includes("css")
    ) {

        let css =
            Buffer.isBuffer(body)
                ? body.toString("utf8")
                : String(body);


        css =
            css.replace(
                /url\\(\\s*(['"]?)([^'")]+)\\1\\s*\\)/gi,

                (
                    match,
                    quote,
                    value
                ) => {

                    const trimmed =
                        value.trim();


                    if (
                        !trimmed ||
                        trimmed.startsWith("data:") ||
                        trimmed.startsWith("blob:") ||
                        trimmed.startsWith("#") ||
                        trimmed.startsWith(
                            "/proxy?url="
                        )
                    ) {

                        return match;

                    }


                    try {

                        const absolute =
                            new URL(
                                trimmed,
                                url
                            ).href;


                        if (
                            absolute.startsWith(
                                "http://"
                            ) ||
                            absolute.startsWith(
                                "https://"
                            )
                        ) {

                            const encoded =
                                Buffer
                                    .from(
                                        absolute
                                    )
                                    .toString(
                                        "base64"
                                    )
                                    .replace(
                                        /\+/g,
                                        "-"
                                    )
                                    .replace(
                                        /\//g,
                                        "_"
                                    )
                                    .replace(
                                        /=/g,
                                        ""
                                    );


                            return (
                                'url("/proxy?url=' +
                                encoded +
                                '")'
                            );

                        }

                    }
                    catch (error) {

                        console.log(
                            "CSS URL ERROR:",
                            trimmed,
                            error.message
                        );

                    }


                    return match;

                }
            );


        console.log(
            "CSS PROCESSED:",
            url
        );


        return css;

    }


    /*
     * ============================================================
     * BINARY / OTHER
     * ============================================================
     */

    console.log(
        "RESOURCE PASSED THROUGH:",
        type,
        url
    );


    return body;

}
