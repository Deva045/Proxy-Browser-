// proxy/resourceHandler.js

import { rewriteHTML } from "./html.js";
import { injectProxyScript } from "./inject.js";


export function processResource(
    body,
    contentType,
    url
){

    if(!body){
        return body;
    }


    console.log(
        "PROCESS RESOURCE:",
        contentType,
        url
    );


    const type =
    (contentType || "")
    .toLowerCase();



    // =====================
    // HTML
    // =====================

    if(
        type.includes("text/html")
    ){

        let html =
        body.toString();



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
            html
        );



        console.log(
            "INJECT SUCCESS"
        );



        return html;

    }







    // =====================
    // JAVASCRIPT
    // =====================

    if(
        type.includes("javascript") ||
        type.includes("x-javascript")
    ){

        console.log(
            "JS PASSED THROUGH:",
            url
        );


        return body;

    }








    // =====================
    // CSS
    // =====================

    if(
        type.includes("css")
    ){

        let css =
        body.toString();



        css =
        css.replace(
            /url\(["']?([^"')]+)["']?\)/gi,

            (match,value)=>{


                try{


                    const absolute =
                    new URL(
                        value,
                        url
                    ).href;



                    const encoded =
                    Buffer.from(
                        absolute
                    )
                    .toString("base64")
                    .replace(/\+/g,"-")
                    .replace(/\//g,"_")
                    .replace(/=/g,"");



                    return `url("/proxy?url=${encoded}")`;


                }
                catch(e){

                    return match;

                }

            }
        );



        console.log(
            "CSS PROCESSED:",
            url
        );


        return css;

    }





    // images/fonts/binary

    return body;

}