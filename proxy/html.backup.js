import { encodeURL, shouldProxy } from "./utils.js";



export function rewriteHTML(html, baseURL){


    let output = html;



    /*
        Add base URL support
    */

    output =
    output.replace(

        /<base[^>]*href=["']([^"']+)["'][^>]*>/i,

        (match, value)=>{


            try{


                const absolute =
                    new URL(
                        value,
                        baseURL
                    ).href;



                return `<base href="/proxy?url=${encodeURL(absolute)}">`;


            }
            catch{


                return match;

            }


        }

    );





    /*
        Rewrite links/resources
    */

    output =
    output.replace(

        /(href|src|action|poster)=["']([^"']+)["']/gi,


        (match, attr, value)=>{


            try{


                if(!shouldProxy(value)){

                    return match;

                }



                const absolute =
                    new URL(
                        value,
                        baseURL
                    ).href;



                return `${attr}="/proxy?url=${encodeURL(absolute)}"`;


            }
            catch{


                return match;


            }


        }

    );





    /*
        Rewrite form targets
    */

    output =
    output.replace(

        /<form([^>]*)action=["']([^"']+)["']([^>]*)>/gi,


        (match,before,value,after)=>{


            try{


                const absolute =
                    new URL(
                        value,
                        baseURL
                    ).href;



                return `<form${before}action="/proxy?url=${encodeURL(absolute)}"${after}>`;


            }
            catch{


                return match;


            }


        }

    );





    /*
        Force links to stay inside iframe
    */

    output =
    output.replace(

        /target=["']_blank["']/gi,

        'target="_self"'

    );



    return output;


}
