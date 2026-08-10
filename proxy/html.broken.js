import { encodeURL, shouldProxy } from "./utils.js";


export function rewriteHTML(html, baseURL){

    let output = html;


    function rewriteURL(value){

        try{

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


            return "/proxy?url=" +
            encodeURL(
                absolute
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

        /((?:href|src|action|poster)=["'])([^"']+)(["'])/gi,

        (match,start,value,end)=>{

            return (
                start +
                rewriteURL(value) +
                end
            );

        }

    );





    /*
        preload / modulepreload
    */

    output =
    output.replace(

        /(<link[^>]+href=["'])([^"']+)(["'])/gi,

        (match,start,value,end)=>{

            return (
                start +
                rewriteURL(value) +
                end
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


            const rewritten =
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



            return `srcset="${rewritten}"`;


        }

    );






    /*
        forms stay inside proxy
    */

    output =
    output.replace(

        /target=["']_blank["']/gi,

        'target="_self"'

    );



    return output;

}

export function rewriteHTML(html, baseURL){


    let output = html;



    /*
        Rewrite every URL attribute
    */

    output =
    output.replace(

        /((?:href|src|action|poster|content)=["'])([^"']+)(["'])/gi,

        (match,start,value,end)=>{


            try{


                if(
                    !shouldProxy(value)
                ){

                    return match;

                }



                const absolute =
                new URL(
                    value,
                    baseURL
                ).href;



                return (
                    start +
                    "/proxy?url=" +
                    encodeURL(
                        absolute
                    ) +
                    end
                );


            }
            catch{


                return match;

            }


        }

    );






    /*
        Rewrite srcset images
    */


    output =
    output.replace(

        /srcset=["']([^"']+)["']/gi,

        (match,value)=>{


            try{


                const urls =
                value.split(",");


                const rewritten =
                urls.map(item=>{


                    const parts =
                    item.trim()
                    .split(" ");



                    const absolute =
                    new URL(
                        parts[0],
                        baseURL
                    ).href;



                    parts[0] =
                    "/proxy?url=" +
                    encodeURL(
                        absolute
                    );



                    return parts.join(" ");


                }).join(",");



                return `srcset="${rewritten}"`;


            }
            catch{


                return match;

            }


        }

    );







    /*
        Keep links inside proxy
    */


    output =
    output.replace(

        /target=["']_blank["']/gi,

        'target="_self"'

    );



    return output;


}
