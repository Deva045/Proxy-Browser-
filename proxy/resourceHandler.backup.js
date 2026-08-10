// proxy/resourceHandler.js

import { injectProxyScript } from "./inject.js";
import { encodeURL } from "./utils.js";



function rewriteHTML(
    html,
    baseURL
){


    // rewrite src
    html =
    html.replace(
        /(src|href)=["']([^"']+)["']/gi,
        (match,attr,value)=>{


            try{


                if(
                    value.startsWith("data:") ||
                    value.startsWith("blob:")
                ){

                    return match;

                }



                if(
                    value.startsWith("/proxy?")
                ){

                    return match;

                }



                const absolute =
                new URL(
                    value,
                    baseURL
                ).href;



                return (
                    attr +
                    '="/proxy?url=' +
                    encodeURL(
                        absolute
                    ) +
                    '"'
                );


            }
            catch{

                return match;

            }


        }
    );



    return html;

}





export function processResource(
    body,
    contentType,
    url
){


console.log(
    "PROCESS RESOURCE:",
    contentType,
    url
);



if(!body){

    return body;

}




const type =
contentType
?
contentType.toLowerCase()
:
"";





if(
    type.includes("text/html")
){


    console.log(
        "HTML REWRITE START:",
        url
    );



    body =
    rewriteHTML(
        body,
        url
    );



    body =
    injectProxyScript(
        body,
        url
    );



    console.log(
        "HTML REWRITE DONE:",
        url
    );


}



return body;


}