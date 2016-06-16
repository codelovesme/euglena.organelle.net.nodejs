
/// <reference path="../typings/socket.io/socket.io.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

"use strict";
import * as http from "http";
import {euglena_template} from "euglena.template";
import {euglena} from "euglena";
import Particle = euglena.being.Particle;
import * as io from "socket.io";
import Exception = euglena.sys.type.Exception;
import Response = euglena.being.interaction.Response;


const OrganelleName = "ReceptionOrganelleImplHttp";

let this_: Organelle = null;
export class Organelle extends euglena_template.being.alive.organelles.ReceptionOrganelle {
    private sockets: any;
    private servers: any;
    private httpConnector: HttpRequestManager;
    constructor(){
        super(OrganelleName);
        this_ = this;
        this.sockets = {};
        this.servers = {};
    }
    public receive(particle:Particle,response:euglena.being.interaction.Response): void {
        switch (particle.name){
            case euglena_template.being.ghost.organelle.reception.constants.incomingparticles.Listen:
                this.listen(response);
                break;
            case euglena_template.being.ghost.organelle.reception.constants.incomingparticles.ThrowImpact:
                let throwImpactContent = particle.content as euglena_template.being.ghost.organelle.reception.incomingparticles.ThrowImpactContent;
                this.throwImpact(throwImpactContent.to, throwImpactContent.impact,response);
                break;
            case euglena_template.being.ghost.organelle.impacttransmitter.constants.incomingparticles.ConnectToEuglena:
                this.connectToEuglena(particle.content,response);
                break;
        }
    }
    
    private connectToEuglena(euglenaInfo: euglena_template.being.alive.particles.EuglenaInfo,response:euglena.being.interaction.Response) {
        if (this.servers[euglenaInfo.name]) {
            return;
        }
        var post_options: http.RequestOptions;
        post_options.host = euglenaInfo.url;
        post_options.port = Number(euglenaInfo.port);
        post_options.path = "/";
        post_options.method = 'POST';
        post_options.headers = {
            'Content-Type': 'application/json'
        };
        let server = io("http://" + post_options.host + ":" + post_options.port);
        this.servers[euglenaInfo.name] = server;
        server.on("connect", (socket: SocketIO.Socket) => {
            server.emit("bind",this_.initialProperties.euglenaInfo,(done:boolean)=>{
                if(done){
                    this_.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo,this_.name),response);
                }
            });
            server.on("impact", (impactAssumption: any, callback: (impact:euglena.being.interaction.Impact) => void) => {
                if (euglena.js.Class.instanceOf<euglena.being.interaction.Impact>(euglena_template.reference.being.interaction.Impact, impactAssumption)) {
                    this.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption,OrganelleName),response);
                } else {
                    //TODO
                }
            });
        });
        server.on("disconnect", () => {
            this_.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.DisconnectedFromEuglena(euglenaInfo,this_.name),response);
        });
    }
    private listen(response:Response):void {
        let server = http.createServer((req, res) => {
            if (req.method == 'POST') {
                var body = '';
                req.on('data', (data: string) => {
                    body += data;
                    // Too much POST data, kill the connection!
                    if (body.length > 1e6)
                        req.socket.destroy();
                });
                req.on('end', () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    let impactAssumption:any = null;
                    let result = {result:"Internal Server Error!"}
                    try {
                        impactAssumption = JSON.parse(body);
                        if (euglena.js.Class.instanceOf<euglena.being.interaction.Impact>(euglena_template.reference.being.interaction.Impact, impactAssumption) &&
                            euglena.js.Class.instanceOf<euglena.being.Particle>(euglena_template.reference.being.Particle, (impactAssumption as euglena.being.interaction.Impact).particle)) {
                            result = {result:"ok"};
                            
                        } else {
                            //TODO
                            result = {result:"Request format is uncorrect !"};
                            impactAssumption = null;
                        }
                    } catch (e) {
                        //TODO
                        result = {result:"Request format is uncorrect !"};
                        impactAssumption = null;
                    }
                    if(impactAssumption){
                        this.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption as euglena.being.interaction.Impact,euglena_template.being.alive.constants.organelles.Net),response);
                    }else{
                        //TODO
                    }
                    res.end(JSON.stringify(result));
                });
            } else if (req.method == 'GET') {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Server is running...\n');
            }

        });
        let socket = io.listen(server);
        server.listen(this.initialProperties.port);
        socket.on("connection", (socket:any) => {
            socket.on("bind",(euglenaInfo:euglena_template.being.alive.particles.EuglenaInfo,callback:Response)=>{
                this.sockets[euglenaInfo.name] = socket;
                this_.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo,this_.name),response);
            });
            socket.on("impact", (impactAssumption:euglena.being.interaction.Impact) => {
                this_.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption as euglena.being.interaction.Impact,euglena_template.being.alive.constants.organelles.Net),response);
            });
        });
    }
    private throwImpact(to: euglena_template.being.alive.particles.EuglenaInfo, impact: euglena.being.interaction.Impact,response:Response): void {
        var client = this.sockets[to.name];
        if (client) {
            client.emit("impact", impact, (resp: euglena.being.interaction.Impact) => {
                //TODO
            });
        } else {
            //TODO
            //response(new euglena_template.being.alive.particles.ExceptionOccurred(
                //  new euglena.sys.type.Exception("There is no gateway connected with that id: " + userId)));
            let server = this.servers[to.name];
            if (server){
                server.emit("impact", impact);
            } else {
                //TODO
                var post_options = {
                    host: to.url,
                    port: Number(to.port),
                    path: "/",
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                let httpConnector = new HttpRequestManager(post_options);
                httpConnector.sendMessage(JSON.stringify(impact), (message) => {
                        if (euglena.sys.type.StaticTools.Exception.isNotException<string>(message)) {
                            try {
                                let impactAssumption = JSON.parse(message); 
                                if (euglena.js.Class.instanceOf(euglena_template.reference.being.interaction.Impact,impactAssumption)){
                                    this_.send(new euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption as euglena.being.interaction.Impact,OrganelleName),response);
                                } else {
                                    //TODO log
                                }
                            } catch (e) {
                                //TODO
                            }
                        } else {
                            //TODO write a eligable exception message
                            this_.send(new euglena_template.being.alive.particles.Exception(new Exception(""),OrganelleName),response);
                        }
                    
                });
            }
        }
    }
}

export class HttpRequestManager {
    constructor(public post_options:http.RequestOptions){ }
    public sendMessage(message:string,callback:euglena.sys.type.Callback<string>):void{
        var req = http.request(this.post_options, (res) => {
            res.setEncoding('utf8');
            var str = '';
            res.on('data', (data: string) => {
                str += data;
            });
            res.on('end', (data: string) => {
                callback(str);
            });
        });
        req.setTimeout(10000, () => {
            req.abort();
            callback(new Exception("Request timed out."));
        });
        req.on('error', (e: any) => {
            callback(new Exception("problem with request: " + e.message));
        });
        if(message) req.write(message);
        req.end();
    }
}