export function encodeURL(url){

    return Buffer
        .from(url)
        .toString("base64")
        .replace(/\+/g,"-")
        .replace(/\//g,"_")
        .replace(/=/g,"");

}



export function decodeURL(data){

    data =
    data
    .replace(/-/g,"+")
    .replace(/_/g,"/");



    while(data.length % 4){

        data += "=";

    }



    return Buffer
        .from(
            data,
            "base64"
        )
        .toString();

}



export function isHTML(type){

    return (
        type &&
        type.includes("text/html")
    );

}



export function isCSS(type){

    return (
        type &&
        type.includes("text/css")
    );

}



export function shouldProxy(url){


    if(!url){

        return false;

    }



    return !(
        url.startsWith("#") ||
        url.startsWith("javascript:") ||
        url.startsWith("mailto:") ||
        url.startsWith("data:") ||
        url.startsWith("blob:")
    );


}
