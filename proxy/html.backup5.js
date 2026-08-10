import { encodeURL } from "./utils.js";


export function rewriteHTML(html, baseURL){

    let output = html;


    function rewrite(value){

        try{

            if(
                value.startsWith("data:")
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
        Rewrite all common URL attributes
    */

    output =
    output.replace(

        /((?:src|href|action|poster|content)=["'])([^"']+)(["'])/gi,

        (match,start,url,end)=>{


            return (
                start +
                rewrite(url) +
                end
            );


        }

    );







    /*
        Rewrite srcset
    */

    output =
    output.replace(

        /srcset=["']([^"']+)["']/gi,

        (match,value)=>{


            let result =
            value
            .split(",")

            .map(item=>{


                let parts =
                item.trim().split(" ");


                parts[0] =
                rewrite(parts[0]);


                return parts.join(" ");


            })

            .join(",");



            return `srcset="${result}"`;


        }

    );






    /*
        Fix CORS by forcing scripts/styles through proxy
    */


    output =
    output.replace(

        /https:\/\/static\.cdninstagram\.com[^"' ]+/gi,

        (url)=>{


            return "/proxy?url=" +
            encodeURL(url);


        }

    );



    return output;

}
