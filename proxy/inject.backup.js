import { encodeURL } from "./utils.js";


export function injectProxyScript(html){


    const script = `

<script>

(function(){


function proxyURL(url){


    try{


        if(
            url.startsWith("/proxy?")
        ){

            return url;

        }



        if(
            url.startsWith("http")
        ){

            return "/proxy?url=" +
            btoa(url)
            .replace(/\\+/g,"-")
            .replace(/\\//g,"_")
            .replace(/=/g,"");

        }



        return url;


    }
    catch{

        return url;

    }


}





/*
    Fetch interception
*/


const originalFetch =
window.fetch;


window.fetch =
function(input,options){


    if(
        typeof input === "string"
    ){

        input =
        proxyURL(input);

    }


    return originalFetch(
        input,
        options
    );


};







/*
    XMLHttpRequest interception
*/


const originalOpen =
XMLHttpRequest.prototype.open;


XMLHttpRequest.prototype.open =
function(
    method,
    url,
    ...rest
){


    url =
    proxyURL(url);


    return originalOpen.call(
        this,
        method,
        url,
        ...rest
    );


};







/*
    WebSocket interception
*/


const OriginalWebSocket =
window.WebSocket;



window.WebSocket =
function(url,protocols){


    return new OriginalWebSocket(
        proxyURL(url),
        protocols
    );


};





/*
    SPA navigation watcher
*/


const oldPush =
history.pushState;


history.pushState =
function(){

    setTimeout(
        ()=>window.dispatchEvent(
            new Event("locationchange")
        ),
        50
    );


    return oldPush.apply(
        this,
        arguments
    );

};



})();

</script>

`;



    return html.replace(
        /<\/body>/i,
        script + "</body>"
    );


}
