// server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import cookieParser from "cookie-parser";

import { createSession } from "./proxy/session.js";
import { fetchWebsite } from "./proxy/fetcher.js";
import { decodeURL, encodeURL } from "./proxy/utils.js";
import { processResource } from "./proxy/resourceHandler.js";
import { setupWebSocket } from "./proxy/websocket.js";


const app = express();

const server =
    createServer(app);


/*
 * ============================================================
 * CORS
 * ============================================================
 */

app.use(
    (req, res, next) => {

        res.setHeader(
            "Access-Control-Allow-Origin",
            "*"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "*"
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD"
        );

        res.setHeader(
            "Access-Control-Allow-Credentials",
            "true"
        );


        if (
            req.method === "OPTIONS"
        ) {

            return res
                .status(204)
                .end();

        }


        next();

    }
);


/*
 * ============================================================
 * REQUEST BODY
 * ============================================================
 *
 * Keep proxied request bodies as raw bytes.
 *
 * Instagram uses multipart/form-data for some /ajax/bz
 * requests, so converting everything to text can corrupt
 * the request body.
 */

app.use(
    express.raw({
        type: "*/*",
        limit: "50mb"
    })
);


/*
 * ============================================================
 * COOKIES
 * ============================================================
 */

app.use(
    cookieParser()
);


/*
 * ============================================================
 * PROXY SESSION
 * ============================================================
 */

app.use(
    (req, res, next) => {

        let sessionId =
            req.cookies?.proxy_session;


        if (!sessionId) {

            sessionId =
                createSession();


            res.cookie(
                "proxy_session",
                sessionId,
                {
                    httpOnly: true,
                    sameSite: "lax",
                    secure: false,
                    path: "/"
                }
            );


            console.log(
                "PROXY SESSION CREATED:",
                sessionId
            );

        }
        else {

            console.log(
                "PROXY SESSION:",
                sessionId
            );

        }


        req.proxySessionId =
            sessionId;


        next();

    }
);


const __filename =
    fileURLToPath(import.meta.url);


const __dirname =
    path.dirname(__filename);


/*
 * ============================================================
 * STATIC FILES
 * ============================================================
 */

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/*
 * ============================================================
 * COMMON PROXY RESPONSE
 * ============================================================
 */

async function sendProxyResponse(
    req,
    res,
    target
) {

    /*
     * Validate target URL.
     */

    let parsedTarget;


    try {

        parsedTarget =
            new URL(target);

    }
    catch {

        return res
            .status(400)
            .send("Invalid target URL");

    }


    if (
        parsedTarget.protocol !== "http:" &&
        parsedTarget.protocol !== "https:"
    ) {

        return res
            .status(400)
            .send("Unsupported URL protocol");

    }


    console.log(
        "=============================="
    );


    console.log(
        "REQUEST:",
        req.method,
        target
    );


    /*
     * Preserve the raw request body.
     */

    const requestBody =
        Buffer.isBuffer(req.body)
            ? req.body
            : (
                req.body
                    ? Buffer.from(
                        String(req.body)
                    )
                    : null
            );


    console.log(
        "BODY SIZE:",
        requestBody
            ? requestBody.length
            : 0
    );


    console.log(
        "COOKIE:",
        req.headers.cookie || ""
    );


    /*
     * Do not print binary request bodies.
     */

    if (
        requestBody &&
        requestBody.length > 0
    ) {

        const preview =
            requestBody
                .subarray(
                    0,
                    Math.min(
                        requestBody.length,
                        200
                    )
                )
                .toString(
                    "utf8"
                )
                .replace(
                    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
                    "."
                );


        console.log(
            "BODY PREVIEW:",
            preview
        );

    }


    /*
     * ========================================================
     * UPSTREAM REQUEST
     * ========================================================
     */

    const result =
        await fetchWebsite(

            target,

            req.headers.cookie || "",

            req.method,

            requestBody,

            req.headers,

            req.proxySessionId

        );


    console.log(
        "STATUS:",
        result.status
    );


    console.log(
        "CONTENT TYPE:",
        result.contentType
    );


    console.log(
        "RESPONSE HEADERS:",
        result.headers
    );


    console.log(
        "RESPONSE LOCATION:",
        result.location
    );


    /*
     * ========================================================
     * REDIRECT
     * ========================================================
     *
     * Keep redirects inside the proxy.
     */

    if (
        result.location &&
        result.status >= 300 &&
        result.status < 400
    ) {

        let redirect;


        try {

            redirect =
                new URL(
                    result.location,
                    target
                ).href;

        }
        catch (error) {

            console.log(
                "REDIRECT URL ERROR:",
                error.message
            );


            return res
                .status(502)
                .send(
                    "Invalid upstream redirect"
                );

        }


        console.log(
            "REDIRECT:",
            redirect
        );


        return res.redirect(
            302,
            "/proxy?url=" +
            encodeURL(
                redirect
            )
        );

    }


    /*
     * ========================================================
     * RESOURCE PROCESSING
     * ========================================================
     */

    let body =
        result.body;


    body =
        processResource(
            body,
            result.contentType,
            target
        );


    /*
     * ========================================================
     * RESPONSE HEADERS
     * ========================================================
     */

    if (
        result.contentType
    ) {

        res.setHeader(
            "Content-Type",
            result.contentType
        );

    }


    if (
        result.headers
    ) {

        for (
            const [name, value]
            of Object.entries(
                result.headers
            )
        ) {

            /*
             * Content-Type is already managed above.
             */

            if (
                name.toLowerCase() ===
                "content-type"
            ) {
                continue;
            }


            /*
             * Never forward hop-by-hop headers.
             */

            const lower =
                name.toLowerCase();


            if (
                lower === "connection" ||
                lower === "keep-alive" ||
                lower === "proxy-authenticate" ||
                lower === "proxy-authorization" ||
                lower === "te" ||
                lower === "trailer" ||
                lower === "transfer-encoding" ||
                lower === "upgrade"
            ) {
                continue;
            }


            res.setHeader(
                name,
                value
            );

        }

    }


    /*
     * Allow resources to be consumed from the
     * proxy origin.
     */

    res.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
    );


    res.setHeader(
        "Cross-Origin-Opener-Policy",
        "unsafe-none"
    );


    res.setHeader(
        "Cross-Origin-Embedder-Policy",
        "unsafe-none"
    );


    /*
     * Dynamic proxy responses should not be cached.
     */

    res.setHeader(
        "Cache-Control",
        "no-store"
    );


    console.log(
        "UPSTREAM COOKIES STORED SERVER-SIDE:",
        result.cookies
            ? (
                Array.isArray(result.cookies)
                    ? result.cookies.length
                    : 1
            )
            : 0
    );


    /*
     * HEAD responses have no body.
     */

    if (
        req.method === "HEAD"
    ) {

        return res
            .status(
                result.status
            )
            .end();

    }


    return res
        .status(
            result.status
        )
        .send(
            body
        );

}


/*
 * ============================================================
 * PRIMARY PROXY ROUTE
 * ============================================================
 *
 * /proxy?url=<base64url>
 */

app.all(
    "/proxy",
    async (req, res) => {

        try {

            const encoded =
                req.query.url;


            if (!encoded) {

                return res
                    .status(400)
                    .send(
                        "Missing URL"
                    );

            }


            const target =
                decodeURL(
                    encoded
                );


            return await sendProxyResponse(
                req,
                res,
                target
            );

        }
        catch (error) {

            console.log(
                "PROXY ERROR:",
                error
            );


            return res
                .status(500)
                .send(
                    error.message
                );

        }

    }
);


/*
 * ============================================================
 * DIRECT UPSTREAM API COMPATIBILITY ROUTE
 * ============================================================
 *
 * Some sites can issue requests such as:
 *
 *     /ajax/bz
 *     /ajax/bulk-route-definitions/
 *     /api/...
 *     /graphql
 *
 * directly against the current document origin.
 *
 * In Proxy Browser the current document origin is our proxy
 * server, so those requests would otherwise become Express
 * 404s.
 *
 * We recover the upstream origin from the proxy page's
 * Referer:
 *
 *     /proxy?url=<encoded-upstream-page>
 *
 * Then resolve the requested API path against that upstream
 * page and send the request through the same fetcher.
 */

app.all(
    /^\/(?:ajax|api)(?:\/.*)?$/,
    async (req, res) => {

        try {

            const referer =
                req.get("referer") ||
                req.get("referrer") ||
                "";


            if (!referer) {

                console.log(
                    "DIRECT API PROXY: missing referer"
                );


                return res
                    .status(400)
                    .send(
                        "Cannot determine upstream origin"
                    );

            }


            let refererURL;


            try {

                refererURL =
                    new URL(
                        referer
                    );

            }
            catch {

                return res
                    .status(400)
                    .send(
                        "Invalid proxy referer"
                    );

            }


            /*
             * Only trust our own /proxy page as the
             * source of the upstream URL.
             */

            if (
                refererURL.pathname !==
                "/proxy"
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid proxy referer"
                    );

            }


            const encoded =
                refererURL.searchParams.get(
                    "url"
                );


            if (!encoded) {

                return res
                    .status(400)
                    .send(
                        "Missing upstream URL in referer"
                    );

            }


            const upstreamPage =
                decodeURL(
                    encoded
                );


            const upstreamURL =
                new URL(
                    upstreamPage
                );


            /*
             * Preserve the browser's exact API path.
             */

            const requestedPath =
                req.path +
                (
                    req.originalUrl.includes("?")
                        ? "?" +
                            req.originalUrl.split("?")[1]
                        : ""
                );


            const target =
                new URL(
                    requestedPath,
                    upstreamURL
                ).href;


            console.log(
                "DIRECT API PROXY:",
                req.method,
                target
            );


            return await sendProxyResponse(
                req,
                res,
                target
            );

        }
        catch (error) {

            console.log(
                "DIRECT API PROXY ERROR:",
                error
            );


            return res
                .status(500)
                .send(
                    error.message
                );

        }

    }
);


/*
 * ============================================================
 * GRAPHQL COMPATIBILITY ROUTE
 * ============================================================
 */

app.all(
    /^\/graphql(?:\/.*)?$/,
    async (req, res) => {

        try {

            const referer =
                req.get("referer") ||
                req.get("referrer") ||
                "";


            if (!referer) {

                return res
                    .status(400)
                    .send(
                        "Cannot determine upstream origin"
                    );

            }


            const refererURL =
                new URL(
                    referer
                );


            if (
                refererURL.pathname !==
                "/proxy"
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid proxy referer"
                    );

            }


            const encoded =
                refererURL.searchParams.get(
                    "url"
                );


            if (!encoded) {

                return res
                    .status(400)
                    .send(
                        "Missing upstream URL in referer"
                    );

            }


            const upstreamPage =
                decodeURL(
                    encoded
                );


            const target =
                new URL(
                    req.originalUrl,
                    new URL(
                        upstreamPage
                    )
                ).href;


            console.log(
                "DIRECT GRAPHQL PROXY:",
                req.method,
                target
            );


            return await sendProxyResponse(
                req,
                res,
                target
            );

        }
        catch (error) {

            console.log(
                "DIRECT GRAPHQL PROXY ERROR:",
                error
            );


            return res
                .status(500)
                .send(
                    error.message
                );

        }

    }
);


/*
 * ============================================================
 * HOME
 * ============================================================
 */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);

/*
 * ============================================================
 * WEBSOCKET PROXY
 * ============================================================
 */

setupWebSocket(server);
/*
 * ============================================================
 * SERVER
 * ============================================================
 */

server.listen(
    8080,
    () => {

        console.log(
            "Proxy Browser running on port 8080"
        );

    }
);