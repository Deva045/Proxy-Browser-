import { rewriteHTML } from "./html.js";
import { rewriteCSS } from "./css.js";
import { rewriteJS } from "./js.js";
import { injectProxyScript } from "./inject.js";



export function processResource(
    body,
    contentType,
    url
){


    if(
        !body ||
        typeof body !== "string"
    ){

        return body;

    }





    if(
        contentType &&
        contentType.includes("text/html")
    ){


        let output =
            rewriteHTML(
                body,
                url
            );



        output =
            injectProxyScript(
                output
            );



        return output;


    }







    if(
        contentType &&
        contentType.includes("text/css")
    ){


        return rewriteCSS(
            body,
            url
        );


    }








    if(
        contentType &&
        (
            contentType.includes("javascript") ||
            contentType.includes("application/javascript") ||
            contentType.includes("application/js")
        )
    ){


        return rewriteJS(
            body,
            url
        );


    }





    return body;


}
