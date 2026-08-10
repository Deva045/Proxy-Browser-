import { encodeURL, shouldProxy } from "./utils.js";


export function rewriteHTML(
    html,
    baseURL,
    proxyBase = "/"
){

    let output = html;



    function rewriteURL(value){


        try{


            if(
                !value ||
                value.startsWith("data:") ||
                value.startsWith("javascript:") ||
                value.startsWith("#")
            ){

                return value;

            }



            if(
                !shouldProxy(value)
            ){

                return value;

            }



            const absolute =
            new URL(
                value,
                baseURL
            ).href;



            return (
                proxyBase +
                "proxy?url=" +
                encodeURL(
                    absolute
                )
            );


        }
        catch{


            return value;

        }


    }






    /*
        src href action poster
    */


    output =
    output.replace(

        /(src|href|action|poster)=["']([^"']+)["']/gi,

        (match,attr,value)=>{


            return (
                attr +
                '="' +
                rewriteURL(value) +
                '"'
            );


        }

    );







    /*
        Absolute URLs
    */


    output =
    output.replace(

        /(["'])(https?:\/\/[^"']+)\1/gi,

        (match,q,url)=>{


            return (
                q +
                rewriteURL(url) +
                q
            );


        }

    );







    /*
        srcset
    */


    output =
    output.replace(

        /srcset=["']([^"']+)["']/gi,

        (match,value)=>{


            const result =
            value
            .split(",")
            .map(item=>{


                const parts =
                item.trim()
                .split(" ");



                parts[0] =
                rewriteURL(
                    parts[0]
                );



                return parts.join(" ");


            })
            .join(",");



            return (
                'srcset="' +
                result +
                '"'
            );


        }

    );







    /*
        CSS url()
    */


    output =
    output.replace(

        /url\(["']?([^"')]+)["']?\)/gi,

        (match,url)=>{


            return (
                'url("' +
                rewriteURL(url) +
                '")'
            );


        }

    );







    /*
        iframe fix
    */


    output =
    output.replace(

        /onload=["']pageLoaded\(\)["']/gi,

        ""

    );







    /*
        Open inside proxy
    */


    output =
    output.replace(

        /target=["']_blank["']/gi,

        'target="_self"'

    );



    return output;


}
