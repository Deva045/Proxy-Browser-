export function injectProxyScript(html){


    const script = `

<script>

(function(){



function proxyURL(input){


    try{


        if(!input){

            return input;

        }




        let url =
        input.toString();





        if(
            url.startsWith("/proxy?url=")
        ){

            return url;

        }






        const absolute =
        new URL(
            url,
            window.location.href
        ).href;






        return "/proxy?url=" +
        btoa(absolute)
        .replace(/\\+/g,"-")
        .replace(/\\//g,"_")
        .replace(/=/g,"");



    }
    catch{


        return input;


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
    else if(
        input instanceof Request
    ){


        input =
        new Request(
            proxyURL(input.url),
            input
        );


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
function(
    url,
    protocols
){



    return new OriginalWebSocket(
        proxyURL(url),
        protocols
    );


};







/*
    SPA navigation detection
*/


const oldPush =
history.pushState;



history.pushState =
function(){


    const result =
    oldPush.apply(
        this,
        arguments
    );


    window.dispatchEvent(
        new Event(
            "locationchange"
        )
    );


    return result;


};






})();

</script>

`;



    return html.replace(
        /<\/body>/i,
        script + "</body>"
    );


}
