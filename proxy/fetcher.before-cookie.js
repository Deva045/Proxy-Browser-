export async function fetchWebsite(
    url,
    cookies = "",
    method = "GET",
    body = null,
    clientHeaders = {}
){


    const headers = {


        "User-Agent":
        clientHeaders["user-agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",



        "Accept":
        clientHeaders["accept"] ||
        "*/*",



        "Accept-Language":
        clientHeaders["accept-language"] ||
        "en-US,en;q=0.9",



        "Referer":
        "https://www.instagram.com/",



        "Origin":
        "https://www.instagram.com/",



        "X-Requested-With":
        "XMLHttpRequest",



        "X-IG-App-ID":
        "936619743392459",



        "Accept-Encoding":
        "gzip, deflate, br",



        "Connection":
        "keep-alive"



    };





    /*
        Forward stored cookies
    */


    if(cookies){


        headers.Cookie =
        cookies;



        const csrf =
        cookies
        .split(";")
        .find(
            c =>
            c.trim()
            .startsWith("csrftoken=")
        );



        if(csrf){


            headers["X-CSRFToken"] =
            csrf
            .split("=")[1];


        }


    }







    /*
        Debug request
    */


    console.log(
        "FETCH METHOD:",
        method
    );



    console.log(
        "FETCH URL:",
        url
    );







    const response =
    await fetch(
        url,
        {


            method,


            redirect:
            "manual",



            headers,



            body:
            method === "GET" ||
            method === "HEAD"
            ?
            undefined
            :
            typeof body === "string"
            ?
            body
            :
            body
            ?
            JSON.stringify(body)
            :
            null


        }
    );







    /*
        Debug response headers
    */


    console.log(
        "RESPONSE HEADERS:",
        [...response.headers.entries()]
    );







    const contentType =
    response.headers.get(
        "content-type"
    );



    const location =
    response.headers.get(
        "location"
    );







    /*
        Extract cookies
    */


    let setCookies = [];



    if(
        typeof response.headers.getSetCookie === "function"
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







    /*
        Clean cookie values
    */


    setCookies =
    setCookies.map(
        cookie =>
        cookie
        .split(";")[0]
    );



    console.log(
        "FETCH COOKIES:",
        setCookies
    );








    let responseBody;





    if(
        contentType &&
        (
            contentType.includes("text") ||
            contentType.includes("javascript") ||
            contentType.includes("json") ||
            contentType.includes("xml") ||
            contentType.includes("css") ||
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