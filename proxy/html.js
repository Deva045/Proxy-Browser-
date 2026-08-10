// proxy/html.js

import { encodeURL } from "./utils.js";


export function rewriteHTML(html, baseURL) {


if(!html){
    return html;
}


console.log(
    "HTML REWRITE START:",
    baseURL
);



function proxyURL(value){


    if(!value){
        return value;
    }


    value=value.trim();



    if(
        value.startsWith("/proxy?url=") ||
        value.startsWith("#") ||
        value.startsWith("data:") ||
        value.startsWith("javascript:") ||
        value.startsWith("blob:")
    ){
        return value;
    }



    try{


        const absolute =
        new URL(
            value,
            baseURL
        ).href;



        if(
            absolute.startsWith("http")
        ){

            return "/proxy?url=" +
            encodeURL(
                absolute
            );

        }


    }
    catch(e){}



    return value;

}





//
// ALL HTML URL ATTRIBUTES
//

html =
html.replace(

/(["'])(https?:\/\/[^"']+)\1/gi,


(match,q,url)=>{


return q +
proxyURL(url) +
q;


}

);






//
// relative src/href
//

html =
html.replace(

/(\b(?:src|href|action|poster|data-src|data-href)=["'])([^"']+)(["'])/gi,


(match,start,url,end)=>{


return (
start +
proxyURL(url) +
end
);


}

);






//
// srcset
//

html =
html.replace(

/srcset=["']([^"']+)["']/gi,


(match,value)=>{


let out =
value.split(",")

.map(x=>{


let parts =
x.trim().split(" ");


parts[0]=
proxyURL(parts[0]);


return parts.join(" ");


})

.join(",");



return `srcset="${out}"`;

}

);






//
// preload/modulepreload
//

html =
html.replace(

/(<link[^>]+href=["'])([^"']+)(["'])/gi,


(match,a,url,b)=>{


return a+
proxyURL(url)+
b;


}

);





console.log(
"HTML REWRITE DONE"
);



return html;

}