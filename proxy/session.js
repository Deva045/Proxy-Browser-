import crypto from "crypto";


const sessions = new Map();



export function createSession(){


    const id =
        crypto
        .randomBytes(16)
        .toString("hex");



    sessions.set(
        id,
        {
            cookies:""
        }
    );


    return id;

}



export function getSession(id){


    if(!sessions.has(id)){


        sessions.set(
            id,
            {
                cookies:""
            }
        );


    }


    return sessions.get(id);

}
