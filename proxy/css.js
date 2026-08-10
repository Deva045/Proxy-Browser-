import { encodeURL } from "./utils.js";



export function rewriteCSS(css, baseURL){


    let output = css;





    /*
        Rewrite @import

        Example:

        @import "style.css";
    */


    output =
    output.replace(

        /@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/gi,


        (match,value)=>{


            try{


                if(
                    value.startsWith("data:")
                ){

                    return match;

                }



                const absolute =
                    new URL(
                        value,
                        baseURL
                    ).href;



                return `@import url("/proxy?url=${encodeURL(absolute)}")`;



            }
            catch{


                return match;

            }


        }

    );








    /*
        Rewrite url()

        Handles:

        images
        fonts
        backgrounds
        SVG
    */


    output =
    output.replace(

        /url\(\s*["']?([^"')]+)["']?\s*\)/gi,


        (match,value)=>{


            try{


                if(
                    value.startsWith("data:") ||
                    value.startsWith("#") ||
                    value.startsWith("blob:")
                ){

                    return match;

                }



                const absolute =
                    new URL(
                        value,
                        baseURL
                    ).href;



                return `url("/proxy?url=${encodeURL(absolute)}")`;



            }
            catch{


                return match;


            }


        }

    );







    /*
        Rewrite CSS sourceMappingURL

    */


    output =
    output.replace(

        /sourceMappingURL=([^\s]+)/gi,


        (match,value)=>{


            try{


                const absolute =
                    new URL(
                        value,
                        baseURL
                    ).href;



                return (
                    "sourceMappingURL=/proxy?url=" +
                    encodeURL(
                        absolute
                    )
                );


            }
            catch{


                return match;


            }


        }

    );





    return output;


}
