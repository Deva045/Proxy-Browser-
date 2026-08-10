// proxy/inject.js


export function injectProxyScript(html){


if(!html){
    return html;
}



const script = `

<script>

(function(){


console.log("PROXY INJECT ACTIVE");



function encodeURL(url){

    return btoa(url)
    .replace(/\\+/g,"-")
    .replace(/\\//g,"_")
    .replace(/=/g,"");

}





//
// FETCH HOOK
//

const oldFetch = window.fetch;



window.fetch = function(input, options){


try{


let url =
typeof input === "string"
?
input
:
input.url;



if(
url &&
url.startsWith("http")
){


console.log(
"FETCH INTERCEPT:",
url
);



url =
"/proxy?url=" +
encodeURL(url);



if(
typeof input === "string"
){

input=url;

}
else{


input =
new Request(
url,
input
);


}


}


}
catch(e){

console.log(
"FETCH ERROR",
e
);

}



return oldFetch(
input,
options
);


};








//
// XHR HOOK
//

const oldOpen =
XMLHttpRequest.prototype.open;



XMLHttpRequest.prototype.open =
function(
method,
url,
async,
user,
password
){


try{


if(
typeof url === "string" &&
url.startsWith("http")
){


console.log(
"XHR INTERCEPT:",
method,
url
);



url =
"/proxy?url=" +
encodeURL(url);



}



}
catch(e){}



return oldOpen.call(
this,
method,
url,
async,
user,
password
);


};






console.log(
"PROXY HOOKS READY"
);



})();

</script>

`;





//
// insert before head close
//

if(
html.includes("</head>")
){


return html.replace(
"</head>",
script +
"</head>"
);


}




return (
script +
html
);



}