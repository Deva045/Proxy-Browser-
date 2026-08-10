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
    express.static(
        publicPath
    )
);








/*
    Session
*/


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
    getSession(
        sessionID
    );



    next();


});









/*
    Proxy route
*/


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
        decodeURL(
            encoded
        );





        console.log(
            "METHOD:",
            req.method,
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





        console.log(
            "STATUS:",
            result.status,
            "TYPE:",
            result.contentType
        );







        if(result.cookies){


            req.session.cookies =
            result.cookies;


        }








        /*
            Redirect
        */


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



            return res
            .status(200)
            .send(
`
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









        const proxyBase =
        req.protocol +
        "://" +
        req.get("host") +
        "/";






        let body =
        processResource(
            result.body,
            result.contentType,
            target,
            proxyBase
        );








        res.status(
            result.status
        );





        /*
            Forward safe headers
        */


        if(result.contentType){

            res.setHeader(
                "Content-Type",
                result.contentType
            );

        }



        res.removeHeader(
            "X-Frame-Options"
        );



        res.setHeader(
            "Content-Security-Policy",
            "frame-ancestors *;"
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
            "Proxy Error: " +
            error.message
        );


    }


});









/*
    Home page
*/


app.use(
(req,res)=>{


    res.sendFile(
        path.join(
            publicPath,
            "index.html"
        )
    );


});








setupWebSocket(
    server
);







server.listen(
8080,
()=>{


console.log(
"Proxy Browser running on port 8080"
);


});
