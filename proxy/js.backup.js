import { encodeURL } from "./utils.js";


export function rewriteJS(js, baseURL){


    return js.replace(

        /(["'`])([^"'`]+)\1/g,

        (match, quote, value)=>{


            try{


                if(
                    value.startsWith("/") ||
                    value.startsWith("http")
                ){

                    const absolute =
                        new URL(
                            value,
                            baseURL
                        ).href;



                    return `${quote}/proxy?url=${encodeURL(absolute)}${quote}`;

                }


                return match;


            }
            catch{


                return match;


            }


        }

    );


}
