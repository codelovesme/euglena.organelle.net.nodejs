/// <reference path="../typings/socket.io/socket.io.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
"use strict";
const http = require("http");
const euglena_template_1 = require("euglena.template");
const euglena_1 = require("euglena");
const io = require("socket.io");
var Exception = euglena_1.euglena.sys.type.Exception;
const OrganelleName = "ReceptionOrganelleImplHttp";
let this_ = null;
class Organelle extends euglena_template_1.euglena_template.being.alive.organelles.ReceptionOrganelle {
    constructor() {
        super(OrganelleName);
        this_ = this;
        this.sockets = {};
        this.servers = {};
    }
    receive(particle, response) {
        switch (particle.name) {
            case euglena_template_1.euglena_template.being.ghost.organelle.reception.constants.incomingparticles.Listen:
                this.listen(response);
                break;
            case euglena_template_1.euglena_template.being.ghost.organelle.reception.constants.incomingparticles.ThrowImpact:
                let throwImpactContent = particle.content;
                this.throwImpact(throwImpactContent.to, throwImpactContent.impact, response);
                break;
            case euglena_template_1.euglena_template.being.ghost.organelle.impacttransmitter.constants.incomingparticles.ConnectToEuglena:
                this.connectToEuglena(particle.content, response);
                break;
        }
    }
    connectToEuglena(euglenaInfo, response) {
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
                    this_.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo, this_.name), response);
                }
            });
            server.on("impact", (impactAssumption, callback) => {
                if (euglena_1.euglena.js.Class.instanceOf(euglena_template_1.euglena_template.reference.being.interaction.Impact, impactAssumption)) {
                    this.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption, OrganelleName), response);
                }
                else {
                }
            });
        });
        server.on("disconnect", () => {
            this_.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.DisconnectedFromEuglena(euglenaInfo, this_.name), response);
        });
    }
    listen(response) {
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
                        if (euglena_1.euglena.js.Class.instanceOf(euglena_template_1.euglena_template.reference.being.interaction.Impact, impactAssumption) &&
                            euglena_1.euglena.js.Class.instanceOf(euglena_template_1.euglena_template.reference.being.Particle, impactAssumption.particle)) {
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
                        this.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption, euglena_template_1.euglena_template.being.alive.constants.organelles.Net), response);
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
                this_.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.ConnectedToEuglena(euglenaInfo, this_.name), response);
            });
            socket.on("impact", (impactAssumption) => {
                this_.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption, euglena_template_1.euglena_template.being.alive.constants.organelles.Net), response);
            });
        });
    }
    throwImpact(to, impact, response) {
        var client = this.sockets[to.name];
        if (client) {
            client.emit("impact", impact, (resp) => {
                //TODO
            });
        }
        else {
            //TODO
            //response(new euglena_template.being.alive.particles.ExceptionOccurred(
            //  new euglena.sys.type.Exception("There is no gateway connected with that id: " + userId)));
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
                    if (euglena_1.euglena.sys.type.StaticTools.Exception.isNotException(message)) {
                        try {
                            let impactAssumption = JSON.parse(message);
                            if (euglena_1.euglena.js.Class.instanceOf(euglena_template_1.euglena_template.reference.being.interaction.Impact, impactAssumption)) {
                                this_.send(new euglena_template_1.euglena_template.being.ghost.organelle.reception.outgoingparticles.ImpactReceived(impactAssumption, OrganelleName), response);
                            }
                            else {
                            }
                        }
                        catch (e) {
                        }
                    }
                    else {
                        //TODO write a eligable exception message
                        this_.send(new euglena_template_1.euglena_template.being.alive.particles.Exception(new Exception(""), OrganelleName), response);
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