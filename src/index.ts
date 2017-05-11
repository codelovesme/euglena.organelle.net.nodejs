/*


TODO LIST
--------------------
to next major version 
1. remove Listen and call this.listen in NetOrganelleSap action
2.


*/



"use strict";
import * as http from "http";
import * as euglena_template from "@euglena/template";
import * as euglena from "@euglena/core";
import { sys, js } from "cessnalib";
import Particle = euglena.ParticleV1;
import * as io from "socket.io";
import Exception = sys.type.Exception;


const OrganelleName = euglena_template.alive.constants.organelles.NetOrganelle;

let this_: Organelle = null;
export class Organelle extends euglena_template.alive.organelle.NetOrganelle {
    private sockets: any;
    private servers: any;
    private httpConnector: HttpRequestManager;
    constructor() {
        super(OrganelleName);
        this_ = this;
        this.sockets = {};
        this.servers = {};
    }

    private sapContent: euglena_template.alive.particle.NetOrganelleSapContent;
    protected bindActions(addAction: (particleName: string, action: (particle: Particle, callback: (particle: Particle) => void) => void) => void): void {
        addAction(euglena_template.alive.constants.particles.NetOrganelleSap, (particle) => {
            this.sapContent = particle.data;
        });
        addAction(euglena_template.alive.constants.particles.Listen, particle => {
            this.listen();
        });
        addAction(euglena_template.alive.constants.particles.ThrowImpact, particle => {
            let throwImpactContent = particle.data as euglena_template.alive.particle.ThrowImpactContent;
            this.throwImpact(throwImpactContent.to, throwImpactContent.impact);
        });
        addAction(euglena_template.alive.constants.particles.ConnectToEuglena, particle => {
            this.connectToEuglena(particle.data);
        });
    }

    private connectToEuglena(euglenaInfo: euglena_template.alive.particle.EuglenaInfo) {
        if (this.servers[euglenaInfo.data.name]) {
            return;
        }
        var post_options: http.RequestOptions;
        post_options.host = euglenaInfo.data.url;
        post_options.port = Number(euglenaInfo.data.port);
        post_options.path = "/";
        post_options.method = 'POST';
        post_options.headers = {
            'Content-Type': 'application/json'
        };
        let server = io("http://" + post_options.host + ":" + post_options.port);
        this.servers[euglenaInfo.data.name] = server;
        server.on("connect", (socket: SocketIO.Socket) => {
            server.emit("bind", this_.sapContent.euglenaInfo, (done: boolean) => {
                if (done) {
                    this_.send(new euglena_template.alive.particle.ConnectedToEuglena(euglenaInfo, this_.name), this.name);
                }
            });
            server.on("impact", (_impactAssumption: any, callback: (impact: euglena.interaction.Impact) => void) => {
                let impactAssumption = js.Class.clone(_impactAssumption, true);
                this.send(impactAssumption, this.name);
            });
        });
        server.on("disconnect", () => {
            this_.send(new euglena_template.alive.particle.DisconnectedFromEuglena(euglenaInfo, this_.name), this.name);
        });
    }
    private listen(): void {
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
                    let impactAssumption: any = null;
                    let result = { result: "Internal Server Error!" }
                    try {
                        impactAssumption = JSON.parse(body);
                        result = { result: "ok" };
                    } catch (e) {
                        //TODO
                        result = { result: "Request format is uncorrect !" };
                        impactAssumption = null;
                    }
                    if (impactAssumption) {
                        this.send(impactAssumption, this.name);
                    } else {
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
        server.listen(this.sapContent.euglenaInfo.data.port);
        socket.on("connection", (socket: any) => {
            socket.on("bind", (_euglenaInfo: euglena_template.alive.particle.EuglenaInfo, callback: any) => {
                callback(true);
                let euglenaInfo = js.Class.clone(_euglenaInfo, true);
                this.sockets[euglenaInfo.data.name] = socket;
                this_.send(new euglena_template.alive.particle.ConnectedToEuglena(euglenaInfo, this_.name), this.name);
                this_.send(euglenaInfo, this_.name);
            });
            socket.on("impact", (impactAssumption: euglena.interaction.Impact) => {
                let copy = js.Class.clone(impactAssumption, true);
                this_.send(impactAssumption, this.name);
            });
        });
        this.send(new euglena_template.alive.particle.ServerRunning(this.sapContent.euglenaName),this.name);
    }
    private throwImpact(to: euglena_template.alive.particle.EuglenaInfo, impact: euglena.interaction.Impact): void {
        var client = this.sockets[to.data.name];
        if (client) {
            client.emit("impact", impact, (resp: euglena.interaction.Impact) => {
                //TODO
            });
        } else {
            //TODO
            //response(new euglena_template.alive.particles.ExceptionOccurred(
            //  new euglena.sys.type.Exception("There is no gateway connected with that id: " + userId)));
            let server = this.servers[to.data.name];
            if (server) {
                server.emit("impact", impact);
            } else {
                //TODO
                var post_options = {
                    host: to.data.url,
                    port: Number(to.data.port),
                    path: "/",
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                let httpConnector = new HttpRequestManager(post_options);
                httpConnector.sendMessage(JSON.stringify(impact), (message: any) => {
                    if (sys.type.StaticTools.Exception.isNotException<string>(message)) {
                        try {
                            let impactAssumption = JSON.parse(message);
                            this_.send(impactAssumption, this.name);
                        } catch (e) {
                            //TODO
                        }
                    } else {
                        //TODO write a eligable exception message
                        this_.send(new euglena_template.alive.particle.Exception(new Exception(""), OrganelleName), this.name);
                    }

                });
            }
        }
    }
}

export class HttpRequestManager {
    constructor(public post_options: http.RequestOptions) { }
    public sendMessage(message: string, callback: sys.type.Callback<string>): void {
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
        if (message) req.write(message);
        req.end();
    }
}