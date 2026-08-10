import WebSocket, { WebSocketServer } from "ws";


export function setupWebSocket(server){


    const wss =
        new WebSocketServer({
            noServer:true
        });



    server.on(
        "upgrade",
        (request, socket, head)=>{


            const url =
                new URL(
                    request.url,
                    "http://localhost"
                );



            if(
                !url.pathname.startsWith("/ws")
            ){

                socket.destroy();

                return;

            }



            const target =
                url.searchParams.get(
                    "url"
                );



            if(!target){

                socket.destroy();

                return;

            }



            wss.handleUpgrade(
                request,
                socket,
                head,
                (client)=>{


                    const remote =
                        new WebSocket(
                            target
                        );



                    client.on(
                        "message",
                        data=>{


                            if(
                                remote.readyState ===
                                WebSocket.OPEN
                            ){

                                remote.send(data);

                            }


                        }
                    );



                    remote.on(
                        "message",
                        data=>{


                            if(
                                client.readyState ===
                                WebSocket.OPEN
                            ){

                                client.send(data);

                            }


                        }
                    );



                    client.on(
                        "close",
                        ()=>{


                            remote.close();


                        }
                    );



                    remote.on(
                        "close",
                        ()=>{


                            client.close();


                        }
                    );


                }
            );


        }
    );


}
