/// <reference path="../typings/socket.io/socket.io.d.ts" />
"use strict";
var http = require("http");
var cessnalib_template_1 = require("../node_modules/cessnalib/cessnalib_template/src/cessnalib_template");
var cessnalib_1 = require("../node_modules/cessnalib/cessnalib/src/cessnalib");
var io = require("socket.io");
var Exception = cessnalib_1.cessnalib.sys.type.Exception;
const OrganelleName = "ReceptionOrganelleImplHttp";
let organelle = null;
let this_ = null;
class Organelle extends cessnalib_template_1.cessnalib_template.being.alive.organelles.ReceptionOrganelle {
    constructor() {
        super(OrganelleName);
        this_ = this;
        organelle = this;
        this.sockets = {};
        this.servers = {};
    }
    receiveParticle(particle) {
        switch (particle.name) {
            case cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.constants.incomingparticles.Listen:
                this.listen();
                break;
            case cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.constants.incomingparticles.ThrowImpact:
                let throwImpactContent = particle.content;
                this.throwImpact(throwImpactContent.to, throwImpactContent.impact);
                break;
            case cessnalib_template_1.cessnalib_template.being.ghost.euglena.impacttransmitter.constants.incomingparticles.ConnectToEuglena:
                this.connectToEuglena(particle.content);
                break;
        }
    }
    connectToEuglena(euglenaInfo) {
        if (this.servers[euglenaInfo.name]) {
            return;
        }
        var post_options;
        post_options.host = euglenaInfo.url;
        post_options.port = Number(euglenaInfo.port);
        post_options.path = "/";
        post_options.method = 'POST';
        post_options.headers = {
            'Content-Type': 'application/json'
        };
        let server = io("http://" + post_options.host + ":" + post_options.port);
        this.servers[euglenaInfo.name] = server;
        server.on("connect", (socket) => {
            server.emit("bind", this_.initialProperties.euglenaInfo, (done) => {
                if (done) {
                    this_.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo, this_.name));
                }
            });
            server.on("impact", (impactAssumption, callback) => {
                if (cessnalib_1.cessnalib.js.Class.instanceOf(cessnalib_template_1.cessnalib_template.reference.being.interaction.Impact, impactAssumption)) {
                    this.nucleus.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption, organelle));
                }
                else {
                }
            });
        });
        server.on("disconnect", () => {
            this_.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.DisconnectedFromEuglena(euglenaInfo, this_.name));
        });
    }
    listen() {
        let server = http.createServer((req, res) => {
            if (req.method == 'POST') {
                var body = '';
                req.on('data', (data) => {
                    body += data;
                    // Too much POST data, kill the connection!
                    if (body.length > 1e6)
                        req.socket.destroy();
                });
                req.on('end', () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    let impactAssumption = null;
                    let result = { result: "Internal Server Error!" };
                    try {
                        impactAssumption = JSON.parse(body);
                        if (cessnalib_1.cessnalib.js.Class.instanceOf(cessnalib_template_1.cessnalib_template.reference.being.interaction.Impact, impactAssumption) &&
                            cessnalib_1.cessnalib.js.Class.instanceOf(cessnalib_template_1.cessnalib_template.reference.being.Particle, impactAssumption.particle)) {
                            result = { result: "ok" };
                        }
                        else {
                            //TODO
                            result = { result: "Request format is uncorrect !" };
                            impactAssumption = null;
                        }
                    }
                    catch (e) {
                        //TODO
                        result = { result: "Request format is uncorrect !" };
                        impactAssumption = null;
                    }
                    if (impactAssumption) {
                        this.nucleus.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption, cessnalib_template_1.cessnalib_template.being.alive.constants.organelles.ReceptionOrganelle));
                    }
                    else {
                    }
                    res.end(JSON.stringify(result));
                });
            }
            else if (req.method == 'GET') {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Server is running...\n');
            }
        });
        let socket = io.listen(server);
        server.listen(this.initialProperties.port);
        socket.on("connection", (socket) => {
            socket.on("bind", (euglenaInfo, callback) => {
                this.sockets[euglenaInfo.name] = socket;
                callback(true);
                this_.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo, this_.name));
            });
            socket.on("impact", (impactAssumption) => {
                this_.nucleus.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption, cessnalib_template_1.cessnalib_template.being.alive.constants.organelles.ReceptionOrganelle));
            });
        });
    }
    throwImpact(to, impact) {
        var client = this.sockets[to.name];
        if (client) {
            client.emit("impact", impact, (resp) => {
                //TODO
            });
        }
        else {
            //TODO
            //response(new cessnalib_template.being.alive.particles.ExceptionOccurred(
            //  new cessnalib.sys.type.Exception("There is no gateway connected with that id: " + userId)));
            let server = this.servers[to.name];
            if (server) {
                server.emit("impact", impact);
            }
            else {
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
                    if (cessnalib_1.cessnalib.sys.type.StaticTools.Exception.isNotException(message)) {
                        try {
                            let impactAssumption = JSON.parse(message);
                            if (cessnalib_1.cessnalib.js.Class.instanceOf(cessnalib_template_1.cessnalib_template.reference.being.interaction.Impact, impactAssumption)) {
                                this_.nucleus.receiveParticle(new cessnalib_template_1.cessnalib_template.being.ghost.euglena.reception.outgoingparticles.ImpactReceived(impactAssumption, organelle));
                            }
                            else {
                            }
                        }
                        catch (e) {
                        }
                    }
                    else {
                        //TODO write a eligable exception message
                        this_.nucleus.receiveParticle(new cessnalib_template_1.cessnalib_template.being.alive.particles.Exception(new Exception(""), organelle));
                    }
                });
            }
        }
    }
}
exports.Organelle = Organelle;
class HttpRequestManager {
    constructor(post_options) {
        this.post_options = post_options;
    }
    sendMessage(message, callback) {
        var req = http.request(this.post_options, (res) => {
            res.setEncoding('utf8');
            var str = '';
            res.on('data', (data) => {
                str += data;
            });
            res.on('end', (data) => {
                callback(str);
            });
        });
        req.setTimeout(10000, () => {
            req.abort();
            callback(new Exception("Request timed out."));
        });
        req.on('error', (e) => {
            callback(new Exception("problem with request: " + e.message));
        });
        if (message)
            req.write(message);
        req.end();
    }
}
exports.HttpRequestManager = HttpRequestManager;
//# sourceMappingURL=euglena.organelle.net.nodejs.js.map