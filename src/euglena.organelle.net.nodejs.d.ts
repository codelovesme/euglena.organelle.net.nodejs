/// <reference path="../typings/socket.io/socket.io.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
import * as http from "http";
import { euglena_template } from "euglena.template";
import { euglena } from "euglena";
import Particle = euglena.being.Particle;
export declare class Organelle extends euglena_template.being.alive.organelles.ReceptionOrganelle {
    private sockets;
    private servers;
    private httpConnector;
    constructor();
    receive(particle: Particle): void;
    private connectToEuglena(euglenaInfo);
    private listen();
    private throwImpact(to, impact);
}
export declare class HttpRequestManager {
    post_options: http.RequestOptions;
    constructor(post_options: http.RequestOptions);
    sendMessage(message: string, callback: euglena.sys.type.Callback<string>): void;
}
