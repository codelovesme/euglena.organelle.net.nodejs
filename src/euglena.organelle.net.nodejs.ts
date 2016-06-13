
/// <reference path="../typings/socket.io/socket.io.d.ts" />


"use strict";
import * as http from "http";
import {cessnalib_template} from "../node_modules/cessnalib/cessnalib_template/src/cessnalib_template";
import {cessnalib} from "../node_modules/cessnalib/cessnalib/src/cessnalib";
import Particle = cessnalib.being.Particle;
import * as io from "socket.io";
import Exception = cessnalib.sys.type.Exception;

const OrganelleName = "ReceptionOrganelleImplHttp";

let organelle = null;
let this_: Organelle = null;
export class Organelle extends cessnalib_template.being.alive.organelles.ReceptionOrganelle {
    private sockets: any;
    private servers: any;
    private httpConnector: HttpRequestManager;
    constructor(){
        super(OrganelleName);
        this_ = this;
        organelle = this;
        this.sockets = {};
        this.servers = {};
    }
    public receiveParticle(particle:Particle): void {
        switch (particle.name){
            case cessnalib_template.being.ghost.euglena.reception.constants.incomingparticles.Listen:
                this.listen();
                break;
            case cessnalib_template.being.ghost.euglena.reception.constants.incomingparticles.ThrowImpact:
                let throwImpactContent = particle.content as cessnalib_template.being.ghost.euglena.reception.incomingparticles.ThrowImpactContent;
                this.throwImpact(throwImpactContent.to, throwImpactContent.impact);
                break;
            case cessnalib_template.being.ghost.euglena.impacttransmitter.constants.incomingparticles.ConnectToEuglena:
                this.connectToEuglena(particle.content);
                break;
        }
    }
    
    private connectToEuglena(euglenaInfo: cessnalib.being.alive.EuglenaInfo) {
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
                    this_.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo,this_.name));
                }
            });
            server.on("impact", (impactAssumption: any, callback: (impact:cessnalib.being.interaction.Impact) => void) => {
                if (cessnalib.js.Class.instanceOf<cessnalib.being.interaction.Impact>(cessnalib_template.reference.being.interaction.Impact, impactAssumption)) {
                    this.nucleus.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption,organelle));
                } else {
                    //TODO
                }
            });
        });
        server.on("disconnect", () => {
            this_.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.DisconnectedFromEuglena(euglenaInfo,this_.name));
        });
    }
    private listen():void {
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
                        if (cessnalib.js.Class.instanceOf<cessnalib.being.interaction.Impact>(cessnalib_template.reference.being.interaction.Impact, impactAssumption) &&
                            cessnalib.js.Class.instanceOf<cessnalib.being.Particle>(cessnalib_template.reference.being.Particle, (impactAssumption as cessnalib.being.interaction.Impact).particle)) {
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
                        this.nucleus.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption as cessnalib.being.interaction.Impact,cessnalib_template.being.alive.constants.organelles.ReceptionOrganelle));
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
            socket.on("bind",(euglenaInfo:cessnalib.being.alive.EuglenaInfo,callback)=>{
                this.sockets[euglenaInfo.name] = socket;
                callback(true);
                this_.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo,this_.name));
            });
            socket.on("impact", (impactAssumption:cessnalib.being.interaction.Impact) => {
                this_.nucleus.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption as cessnalib.being.interaction.Impact,cessnalib_template.being.alive.constants.organelles.ReceptionOrganelle));
            });
        });
    }
    private throwImpact(to: cessnalib.being.alive.EuglenaInfo, impact: cessnalib.being.interaction.Impact): void {
        var client = this.sockets[to.name];
        if (client) {
            client.emit("impact", impact, (resp: cessnalib.being.interaction.Impact) => {
                //TODO
            });
        } else {
            //TODO
            //response(new cessnalib_template.being.alive.particles.ExceptionOccurred(
                //  new cessnalib.sys.type.Exception("There is no gateway connected with that id: " + userId)));
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
                        if (cessnalib.sys.type.StaticTools.Exception.isNotException<string>(message)) {
                            try {
                                let impactAssumption = JSON.parse(message);
                                if (cessnalib.js.Class.instanceOf(cessnalib_template.reference.being.interaction.Impact,impactAssumption)){
                                    this_.nucleus.receiveParticle(new cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption as cessnalib.being.interaction.Impact,organelle));
                                } else {
                                    //TODO log
                                }
                            } catch (e) {
                                //TODO
                            }
                        } else {
                            //TODO write a eligable exception message
                            this_.nucleus.receiveParticle(new cessnalib_template.being.alive.particles.Exception(new Exception(""),organelle));
                        }
                    
                });
            }
        }
    }
}

export class HttpRequestManager {
    constructor(public post_options:http.RequestOptions){ }
    public sendMessage(message:string,callback:cessnalib.sys.type.Callback<string>):void{
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