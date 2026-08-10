export async function fetchWebsite(
    url,
    cookies = "",
    method = "GET",
    body = null,
    clientHeaders = {}
){


    const isAPI =
        url.includes("/ajax/") ||
        url.includes("/api/") ||
        url.includes("graphql");





    const headers = {


        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",



        "Accept":
        isAPI
        ?
        "*/*"
        :
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",



        "Accept-Language":
        "en-US,en;q=0.9",



        "Cache-Control":
        "no-cache",



        "Pragma":
        "no-cache",



        "Referer":
        "https://www.instagram.com/",



        "Origin":
        "https://www.instagram.com/",



        "X-Requested-With":
        "XMLHttpRequest",



        "X-IG-App-ID":
        "936619743392459",



        "Accept-Encoding":
        "gzip, deflate, br"


    };







    if(cookies){


        headers.Cookie =
        cookies;


    }







    const response =
    await fetch(
        url,
        {

            method,

            redirect:"manual",

            headers,

            body:
            method === "GET" ||
            method === "HEAD"
            ?
            undefined
            :
            body
            ?
            JSON.stringify(body)
            :
            null

        }
    );








    const contentType =
    response.headers.get(
        "content-type"
    );




    const location =
    response.headers.get(
        "location"
    );








    let setCookies = [];



    if(
        response.headers.getSetCookie
    ){


        setCookies =
        response.headers.getSetCookie();


    }
    else{


        const cookie =
        response.headers.get(
            "set-cookie"
        );


        if(cookie){

            setCookies.push(cookie);

        }


    }










    let responseBody;





    if(
        contentType &&
        (
            contentType.includes("text") ||
            contentType.includes("javascript") ||
            contentType.includes("json") ||
            contentType.includes("css") ||
            contentType.includes("xml") ||
            contentType.includes("svg")
        )
    ){


        responseBody =
        await response.text();


    }
    else{


        responseBody =
        Buffer.from(
            await response.arrayBuffer()
        );


    }









    return {


        body:
        responseBody,



        contentType,



        status:
        response.status,



        cookies:
        setCookies.join("; "),



        location


    };


}
