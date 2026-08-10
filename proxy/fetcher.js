// proxy/fetcher.js

let cookieJar = {};



function saveCookies(setCookie){

    if(!setCookie) return;


    const cookies = Array.isArray(setCookie)
        ? setCookie
        : [setCookie];


    for(const item of cookies){

        const first =
        item.split(";")[0];


        const index =
        first.indexOf("=");


        if(index !== -1){

            const name =
            first.substring(0,index);


            const value =
            first.substring(index+1);


            cookieJar[name] = value;

        }

    }

}




function getCookies(){

    return Object.entries(cookieJar)
    .map(
        ([k,v])=>`${k}=${v}`
    )
    .join("; ");

}





export async function fetchWebsite(
url,
cookies="",
method="GET",
body=null,
clientHeaders={}
){


console.log(
"FETCHER REQUEST:",
method,
url
);





const headers={};





for(const key of Object.keys(clientHeaders)){


    const lower =
    key.toLowerCase();


    if(
        [
            "host",
            "content-length",
            "cookie",
            "connection"
        ].includes(lower)
    ){
        continue;
    }


    headers[key]=clientHeaders[key];

}






headers["user-agent"] =
headers["user-agent"] ||
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";





// merge cookies

const jarCookies =
getCookies();



headers["cookie"] =
[
cookies,
jarCookies
]
.filter(Boolean)
.join("; ");








if(
body &&
method!=="GET"
){

headers["content-type"] =
headers["content-type"]
||
"application/x-www-form-urlencoded";


}







let response;


try{


response =
await fetch(
url,
{

method,

headers,

body:
method==="GET" ||
method==="HEAD"
?
undefined
:
body,


redirect:"manual"

}

);



}
catch(error){


console.log(
"FETCH FAILED:",
error.message
);


return {

status:500,

contentType:"text/plain",

body:error.message,

cookies:"",

location:null

};


}







console.log(
"FETCH STATUS:",
response.status,
response.headers.get(
"content-type"
)
);







const setCookie =
response.headers.getSetCookie
?
response.headers.getSetCookie()
:
response.headers.get(
"set-cookie"
);




saveCookies(
setCookie
);








const buffer =
Buffer.from(
await response.arrayBuffer()
);







return {


status:
response.status,


contentType:
response.headers.get(
"content-type"
)
||
"application/octet-stream",


body:
buffer.toString(),



cookies:
setCookie || "",



location:
response.headers.get(
"location"
)


};



}