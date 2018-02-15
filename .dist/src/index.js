/*


TODO LIST
--------------------
to next major version
1. remove Listen and call this.listen in NetOrganelleSap action
2.


*/
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const euglena_template = require("@euglena/template");
const euglena = require("@euglena/core");
const cessnalib_1 = require("cessnalib");
const io = require("socket.io");
var Exception = cessnalib_1.sys.type.Exception;
var particles;
(function (particles) {
    let incoming;
    (function (incoming) {
        class EnableUpload extends euglena_template.VoidParticle {
            constructor(of) {
                super(new euglena.MetaV2(EnableUpload.NAME, of));
            }
            c() {
                particles.incoming.EnableUpload.NAME;
            }
        }
        EnableUpload.NAME = "EnableUpload";
        incoming.EnableUpload = EnableUpload;
    })(incoming = particles.incoming || (particles.incoming = {}));
})(particles = exports.particles || (exports.particles = {}));
let this_ = null;
class Organelle extends euglena_template.alive.organelle.NetOrganelle {
    constructor() {
        super();
        this_ = this;
        this.sockets = {};
        this.servers = {};
    }
    bindActions(addAction) {
        addAction(euglena_template.alive.constants.particles.NetOrganelleSap, (particle) => {
            this.sapContent = particle.data;
        });
        addAction(euglena_template.alive.constants.particles.Listen, particle => {
            this.listen();
        });
        addAction(euglena_template.alive.constants.particles.ThrowImpact, particle => {
            let throwImpactContent = particle.data;
            this.throwImpact(throwImpactContent.to, throwImpactContent.impact);
        });
        addAction(euglena_template.alive.constants.particles.ConnectToEuglena, particle => {
            this.connectToEuglena(particle.data);
        });
    }
    connectToEuglena(euglenaInfo) {
        if (this.servers[euglenaInfo.data.name]) {
            return;
        }
        var post_options;
        post_options.host = euglenaInfo.data.url;
        post_options.port = Number(euglenaInfo.data.port);
        post_options.path = "/";
        post_options.method = 'POST';
        post_options.headers = {
            'Content-Type': 'application/json'
        };
        let server = io("http://" + post_options.host + ":" + post_options.port);
        this.servers[euglenaInfo.data.name] = server;
        server.on("connect", (socket) => {
            server.emit("bind", this_.sapContent.euglenaInfo, (done) => {
                if (done) {
                    this_.send(new euglena_template.alive.particle.ConnectedToEuglena(euglenaInfo, this_.name));
                }
            });
            server.on("impact", (_impactAssumption, callback) => {
                let impactAssumption = cessnalib_1.js.Class.clone(_impactAssumption, true);
                this.send(impactAssumption);
            });
        });
        server.on("disconnect", () => {
            this_.send(new euglena_template.alive.particle.DisconnectedFromEuglena(euglenaInfo, this_.name));
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
                        result = { result: "ok" };
                    }
                    catch (e) {
                        //TODO
                        result = { result: "Request format is uncorrect !" };
                        impactAssumption = null;
                    }
                    if (impactAssumption) {
                        if (req.url === '/sync') {
                            this.send(impactAssumption, (p) => res.end(JSON.stringify(p)));
                        }
                        else {
                            res.end(JSON.stringify(result));
                            this.send(impactAssumption);
                        }
                    }
                    else {
                        result = { result: "Request format is uncorrect !" };
                        res.end(JSON.stringify(result));
                    }
                });
            }
            else if (req.method == 'GET') {
                let retrieveApi = new euglena_template.alive.particle.ReadParticle({ meta: { name: euglena_template.alive.constants.particles.Api, of: this.sapContent.euglenaName } }, this.sapContent.euglenaName);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                this.send(retrieveApi, (p) => res.end(JSON.stringify(p)));
            }
        });
        let socket = io.listen(server);
        server.listen(this.sapContent.euglenaInfo.data.port);
        socket.on("connection", (socket) => {
            socket.on("bind", (_euglenaInfo, callback) => {
                callback(true);
                let euglenaInfo = cessnalib_1.js.Class.clone(_euglenaInfo, true);
                this.sockets[euglenaInfo.data.name] = socket;
                this_.send(new euglena_template.alive.particle.ConnectedToEuglena(euglenaInfo, this_.name));
                this_.send(euglenaInfo);
            });
            socket.on("impact", (impactAssumption) => {
                let copy = cessnalib_1.js.Class.clone(impactAssumption, true);
                this_.send(impactAssumption);
            });
        });
        this.send(new euglena_template.alive.particle.ServerRunning(this.sapContent.euglenaInfo.data.port, this.sapContent.euglenaName));
    }
    throwImpact(to, impact) {
        var client = this.sockets[to.data.name];
        if (client) {
            client.emit("impact", impact, (resp) => {
                //TODO
            });
        }
        else {
            //TODO
            //response(new euglena_template.alive.particles.ExceptionOccurred(
            //  new euglena.sys.type.Exception("There is no gateway connected with that id: " + userId)));
            let server = this.servers[to.data.name];
            if (server) {
                server.emit("impact", impact);
            }
            else {
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
                httpConnector.sendMessage(JSON.stringify(impact), (message) => {
                    if (cessnalib_1.sys.type.StaticTools.Exception.isNotException(message)) {
                        try {
                            let impactAssumption = JSON.parse(message);
                            this_.send(impactAssumption);
                        }
                        catch (e) {
                            //TODO
                        }
                    }
                    else {
                        //TODO write a eligable exception message
                        this_.send(new euglena_template.alive.particle.Exception(new Exception(""), this.sapContent.euglenaName));
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

//# sourceMappingURL=index.js.map
