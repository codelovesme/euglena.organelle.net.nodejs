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
    receive(particle: Particle, response: euglena.being.interaction.Response): void;
    private connectToEuglena(euglenaInfo, response);
    private listen(response);
    private throwImpact(to, impact, response);
}
export declare class HttpRequestManager {
    post_options: http.RequestOptions;
    constructor(post_options: http.RequestOptions);
    sendMessage(message: string, callback: euglena.sys.type.Callback<string>): void;
}
