
/// <reference path="../typings/socket.io/socket.io.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

"use strict";
import * as http from "http";
import {euglena_template} from "euglena.template";
import {euglena} from "euglena";
import Particle = euglena.being.Particle;
import * as io from "socket.io";
import Exception = euglena.sys.type.Exception;


const OrganelleName = "ReceptionOrganelleImplHttp";

let this_: Organelle = null;
export class Organelle extends euglena_template.being.alive.organelle.NetOrganelle {
    private sockets: any;
    private servers: any;
    private httpConnector: HttpRequestManager;
    constructor(){
        super(OrganelleName);
        this_ = this;
        this.sockets = {};
        this.servers = {};
        this.addAction(euglena_template.being.alive.constants.particles.ThrowImpact, (particle) => {
            let throwImpactContent = particle.content as euglena_template.being.alive.particle.ThrowImpactContent;
                this_.throwImpact(throwImpactContent.to, throwImpactContent.impact);
        });
        this.addAction(euglena_template.being.alive.constants.particles.ConnectToEuglena, (particle) => {
            this_.connectToEuglena(particle.content);
        });
    }
    protected onGettingAlive(){
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
                        this.send(new euglena_template.being.alive.particle.ImpactReceived(impactAssumption as euglena.being.interaction.Impact,euglena_template.being.alive.constants.organelles.NetOrganelle));
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
        server.listen(this.sap.euglenaInfo.port);
        socket.on("connection", (socket:any) => {
            socket.on("bind",(euglenaInfo:euglena_template.being.alive.particle.EuglenaInfo)=>{
                this.sockets[euglenaInfo.name] = socket;
                this_.send(new euglena_template.being.alive.particle.ConnectedToEuglena(euglenaInfo,this_.name));
            });
            socket.on("impact", (impactAssumption:euglena.being.interaction.Impact) => {
                this_.send(new euglena_template.being.alive.particle.ImpactReceived(impactAssumption as euglena.being.interaction.Impact,euglena_template.being.alive.constants.organelles.NetOrganelle));
            });
        });
    }
    
    private connectToEuglena(euglenaInfo: euglena_template.being.alive.particle.EuglenaInfo) {
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
            server.emit("bind",this_.sap.euglenaInfo,(done:boolean)=>{
                if(done){
                    this_.send(new euglena_template.being.alive.particle.ConnectedToEuglena(euglenaInfo,this_.name));
                }
            });
            server.on("impact", (impactAssumption: any, callback: (impact:euglena.being.interaction.Impact) => void) => {
                if (euglena.js.Class.instanceOf<euglena.being.interaction.Impact>(euglena_template.reference.being.interaction.Impact, impactAssumption)) {
                    this.send(new euglena_template.being.alive.particle.ImpactReceived(impactAssumption,OrganelleName));
                } else {
                    //TODO
                }
            });
        });
        server.on("disconnect", () => {
            this_.send(new euglena_template.being.alive.particle.DisconnectedFromEuglena(euglenaInfo,this_.name));
        });
    }
    private throwImpact(to: euglena_template.being.alive.particle.EuglenaInfo, impact: euglena.being.interaction.Impact): void {
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
                httpConnector.sendMessage(JSON.stringify(impact), (message:any) => {
                        if (euglena.sys.type.StaticTools.Exception.isNotException<string>(message)) {
                            try {
                                let impactAssumption = JSON.parse(message); 
                                if (euglena.js.Class.instanceOf(euglena_template.reference.being.interaction.Impact,impactAssumption)){
                                    this_.send(new euglena_template.being.alive.particle.ImpactReceived(impactAssumption as euglena.being.interaction.Impact,OrganelleName));
                                } else {
                                    //TODO log
                                }
                            } catch (e) {
                                //TODO
                            }
                        } else {
                            //TODO write a eligable exception message
                            this_.send(new euglena_template.being.alive.particle.Exception(new Exception(""),OrganelleName));
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