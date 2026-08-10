const cache = new Map();



export async function fetchWebsite(
    url,
    cookies = "",
    method = "GET",
    body = null,
    clientHeaders = {}
){


    /*
        CACHE
    */

    if(
        url.includes(
            "/ajax/bulk-route-definitions/"
        )
    ){

        const cached =
        cache.get(url);


        if(cached){

            console.log(
                "CACHE HIT:",
                url
            );


            return cached;

        }

    }





    const headers = {


        "User-Agent":
        clientHeaders["user-agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",



        "Accept":
        clientHeaders["accept"] ||
        "*/*",



        "Accept-Language":
        "en-US,en;q=0.9",



        "Referer":
        "https://www.instagram.com/",



        "Origin":
        "https://www.instagram.com",



        "X-Requested-With":
        "XMLHttpRequest",



        "X-IG-App-ID":
        "936619743392459",



        "Sec-Fetch-Site":
        "same-origin",



        "Sec-Fetch-Mode":
        "cors",



        "Sec-Fetch-Dest":
        "empty",



        "Cache-Control":
        "no-cache"

    };






    /*
        CONTENT TYPE
    */


    if(
        clientHeaders["content-type"]
    ){

        headers["Content-Type"] =
        clientHeaders["content-type"];

    }
    else if(
        method !== "GET" &&
        method !== "HEAD"
    ){

        headers["Content-Type"] =
        "application/x-www-form-urlencoded";

    }







    /*
        COOKIES
    */


    if(cookies){

        headers["Cookie"] =
        cookies;



        const csrf =
        cookies
        .split(";")
        .find(
            c =>
            c.trim()
            .startsWith(
                "csrftoken="
            )
        );



        if(csrf){

            headers["X-CSRFToken"] =
            csrf
            .split("=")[1];

        }

    }







    console.log(
        "REQUEST:",
        method,
        url
    );


    console.log(
        "SEND COOKIES:",
        cookies
    );







    let response;



    try{


        response =
        await fetch(
            url,
            {

                method,


                redirect:
                "manual",


                headers,


                body:
                (
                    method === "GET" ||
                    method === "HEAD"
                )
                ?
                undefined
                :
                body


            }
        );


    }
    catch(error){


        console.log(
            "FETCH ERROR:",
            error.message
        );


        throw error;

    }









    const contentType =
    response.headers.get(
        "content-type"
    );



    const location =
    response.headers.get(
        "location"
    );








    /*
        RATE LIMIT FIX
    */


    if(

        response.status === 429 &&

        url.includes(
            "/ajax/bulk-route-definitions/"
        )

    ){


        console.log(
            "RATE LIMITED:",
            url
        );



        const emptyResponse = {


            body:
            "",



            contentType:
            "application/json",



            status:
            200,



            cookies:
            "",



            location:
            null


        };



        cache.set(
            url,
            emptyResponse
        );



        return emptyResponse;


    }









    /*
        RECEIVE COOKIES
    */


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

            setCookies.push(
                cookie
            );

        }

    }





    setCookies =
    setCookies.map(
        c =>
        c.split(";")[0]
    );





    console.log(
        "RECEIVED COOKIES:",
        setCookies
    );









    let resultBody;



    if(

        contentType &&

        (

            contentType.includes("text") ||
            contentType.includes("json") ||
            contentType.includes("javascript") ||
            contentType.includes("css")

        )

    ){

        resultBody =
        await response.text();

    }
    else{


        resultBody =
        Buffer.from(
            await response.arrayBuffer()
        );

    }









    const result = {


        body:
        resultBody,



        contentType,



        status:
        response.status,



        cookies:
        setCookies.join("; "),



        location


    };








    console.log(
        "STATUS:",
        response.status,
        contentType
    );









    /*
        STORE CACHE
    */


    if(

        url.includes(
            "/ajax/bulk-route-definitions/"
        )

        &&

        response.status === 200

    ){


        cache.set(
            url,
            result
        );


        console.log(
            "CACHE STORED:",
            url
        );


    }






    return result;


}