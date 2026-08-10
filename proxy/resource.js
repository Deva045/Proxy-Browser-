import { rewriteHTML } from "./html.js";
import { rewriteJS } from "./js.js";
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





    const lowerURL =
    url.toLowerCase();





    /*
        Never rewrite API responses

        Instagram uses these heavily
    */


    if(
        lowerURL.includes("/ajax/") ||
        lowerURL.includes("/api/") ||
        lowerURL.includes("/graphql") ||
        lowerURL.includes("/logging/") ||
        lowerURL.includes("/webhooks/")
    ){

        console.log(
            "SKIP API REWRITE:",
            url
        );


        return body;

    }








    /*
        HTML
    */


    if(
        contentType &&
        contentType.toLowerCase()
        .includes("text/html")
    ){


        console.log(
            "HTML REWRITE RUNNING:",
            url
        );



        let html =
        body.toString();





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
            "HTML REWRITE DONE"
        );



        return html;

    }









    /*
        JAVASCRIPT
    */


    if(
        contentType &&
        (
            contentType.includes("javascript") ||
            contentType.includes("x-javascript")
        )
    ){



        console.log(
            "JS REWRITE RUNNING:",
            url
        );



        let js =
        body.toString();




        js =
        rewriteJS(
            js,
            url
        );



        return js;

    }









    /*
        CSS
    */


    if(
        contentType &&
        contentType.toLowerCase()
        .includes("css")
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




                    return (
                        `url("/proxy?url=${encoded}")`
                    );


                }
                catch{


                    return match;

                }


            }

        );



        return css;

    }









    /*
        Images, fonts, binary
    */


    return body;


}