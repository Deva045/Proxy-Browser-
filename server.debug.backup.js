import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { createServer } from "http";


import { fetchWebsite } from "./proxy/fetcher.js";
import { decodeURL, encodeURL } from "./proxy/utils.js";
import { getResourceType } from "./proxy/resource.js";
import { processResource } from "./proxy/resourceHandler.js";
import { createSession, getSession } from "./proxy/session.js";
import { setupWebSocket } from "./proxy/websocket.js";



const app = express();

const server =
createServer(app);




app.use(
    cookieParser()
);



app.use(
    express.text({
        type:"*/*",
        limit:"50mb"
    })
);



app.use(
    express.json({
        limit:"50mb"
    })
);





const __filename =
fileURLToPath(import.meta.url);


const __dirname =
path.dirname(__filename);



const publicPath =
path.join(
    __dirname,
    "public"
);





app.use(
    express.static(publicPath)
);







app.use(
(req,res,next)=>{


    let sessionID =
    req.cookies.sessionID;



    if(!sessionID){


        sessionID =
        createSession();



        res.cookie(
            "sessionID",
            sessionID,
            {
                httpOnly:false,
                sameSite:"lax",
                path:"/"
            }
        );

    }




    req.session =
    getSession(sessionID);



    next();


});









app.all(
"/proxy",
async(req,res)=>{


try{


    const encoded =
    req.query.url;



    if(!encoded){

        return res
        .status(400)
        .send(
            "Missing URL"
        );

    }




    const target =
    decodeURL(encoded);





    console.log(
        "Opening:",
        target
    );






    const result =
    await fetchWebsite(
        target,
        req.session.cookies,
        req.method,
        req.body,
        req.headers
    );







    if(result.cookies){

        req.session.cookies =
        result.cookies;

    }







    if(
        result.location &&
        result.status >=300 &&
        result.status <400
    ){


        const redirectURL =
        new URL(
            result.location,
            target
        ).href;




        return res.send(
        `
        <!DOCTYPE html>
        <html>
        <head>

        <meta http-equiv="refresh"
        content="0;url=/proxy?url=${encodeURL(redirectURL)}">

        </head>

        <body>
        Redirecting...
        </body>

        </html>
        `
        );


    }









    let body;



    const type =
    result.contentType || "";



    if(
        type.includes("text") ||
        type.includes("html") ||
        type.includes("css") ||
        type.includes("javascript") ||
        type.includes("json") ||
        type.includes("xml")
    ){


        body =
        processResource(
            result.body,
            type,
            target
        );


    }
    else{


        body =
        result.body;


    }









    res.status(
        result.status
    );



    res.setHeader(
        "Content-Type",
        getResourceType(type)
    );



    res.removeHeader(
        "X-Frame-Options"
    );



    res.setHeader(
        "Content-Security-Policy",
        "frame-ancestors 'self' *;"
    );



    res.setHeader(
        "X-Proxy-Browser",
        "true"
    );



    res.send(
        body
    );



}
catch(error){


    console.error(
        "Proxy Error:",
        error
    );


    res
    .status(500)
    .send(
        "Proxy Error: "+
        error.message
    );


}



});









app.use(
(req,res)=>{


    res.sendFile(
        path.join(
            publicPath,
            "index.html"
        )
    );


});







setupWebSocket(server);







server.listen(
8080,
()=>{


console.log(
"Proxy Browser running on port 8080"
);


});
