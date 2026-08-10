// server.js


import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import cookieParser from "cookie-parser";

import { fetchWebsite } from "./proxy/fetcher.js";
import { decodeURL, encodeURL } from "./proxy/utils.js";
import { processResource } from "./proxy/resourceHandler.js";



const app = express();

const server =
createServer(app);





// ================================
// CORS
// ================================


app.use(
(req,res,next)=>{


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
        "GET,POST,PUT,DELETE,OPTIONS"
    );


    res.setHeader(
        "Access-Control-Allow-Credentials",
        "true"
    );


    next();

});






// ================================
// BODY
// ================================


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


app.use(
cookieParser()
);






const __filename =
fileURLToPath(import.meta.url);


const __dirname =
path.dirname(__filename);







// ================================
// STATIC
// ================================


app.use(
express.static(
    path.join(
        __dirname,
        "public"
    )
)
);









// ================================
// PROXY ROUTE
// ================================


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
        "=============================="
    );


    console.log(
        "REQUEST:",
        req.method,
        target
    );



    console.log(
        "BODY SIZE:",
        req.body
        ?
        req.body.length
        :
        0
    );





    console.log(
        "COOKIE:",
        req.headers.cookie || ""
    );





    if(
        req.body &&
        req.body.length
    ){


        console.log(
            "POST BODY SAMPLE:",
            req.body.substring(
                0,
                500
            )
        );


    }







    const result =
    await fetchWebsite(

        target,

        req.headers.cookie || "",

        req.method,

        req.body,

        req.headers

    );








    console.log(
        "STATUS:",
        result.status
    );


    console.log(
        "CONTENT TYPE:",
        result.contentType
    );







    // ============================
    // COOKIE FIX
    // ============================


    if(result.cookies){


        console.log(
            "RECEIVED COOKIES:",
            result.cookies
        );



        let cookieList = [];



        if(
            Array.isArray(
                result.cookies
            )
        ){

            cookieList =
            result.cookies;


        }
        else{


            cookieList =
            [result.cookies];


        }






        for(
            let cookie of cookieList
        ){



            cookie =
            cookie.replace(
                /domain=[^;]+/gi,
                ""
            );



            cookie =
            cookie.replace(
                /secure/gi,
                ""
            );



            cookie =
            cookie.trim();





            if(cookie){


                res.append(
                    "Set-Cookie",
                    cookie +
                    "; Path=/; SameSite=Lax"
                );


            }



        }



    }









    // ============================
    // REDIRECT
    // ============================


    if(
        result.location &&
        result.status >=300 &&
        result.status <400
    ){



        const redirect =
        new URL(
            result.location,
            target
        ).href;



        console.log(
            "REDIRECT:",
            redirect
        );



        return res.redirect(

            "/proxy?url=" +
            encodeURL(
                redirect
            )

        );


    }









    let body =
    result.body;





    body =
    processResource(

        body,

        result.contentType,

        target

    );








    if(result.contentType){


        res.setHeader(
            "Content-Type",
            result.contentType
        );


    }






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





    res
    .status(
        result.status
    )
    .send(
        body
    );




}
catch(error){


    console.log(
        "PROXY ERROR:",
        error
    );


    res
    .status(500)
    .send(
        error.message
    );


}


});









// ================================
// HOME
// ================================


app.get(
"/",
(req,res)=>{


    res.sendFile(

        path.join(
            __dirname,
            "public",
            "index.html"
        )

    );


});









server.listen(
8080,
()=>{


    console.log(
        "Proxy Browser running on port 8080"
    );


});