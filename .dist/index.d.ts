/// <reference types="node" />
import * as http from "http";
import * as euglena_template from "@euglena/template";
import * as euglena from "@euglena/core";
import { sys } from "cessnalib";
import Particle = euglena.ParticleV1;
export declare namespace particles {
    namespace incoming {
        class EnableUpload extends euglena_template.VoidParticle {
            static readonly NAME: string;
            constructor(of: string);
            c(): void;
        }
    }
    namespace outgoing {
    }
    namespace shared {
    }
}
export declare class Organelle extends euglena_template.alive.organelle.NetOrganelle {
    private sockets;
    private servers;
    private httpConnector;
    constructor();
    private sapContent;
    protected bindActions(addAction: (particleName: string, action: (particle: Particle, callback: (particle: Particle) => void) => void) => void): void;
    private connectToEuglena(euglenaInfo);
    private listen();
    private throwImpact(to, impact);
}
export declare class HttpRequestManager {
    post_options: http.RequestOptions;
    constructor(post_options: http.RequestOptions);
    sendMessage(message: string, callback: sys.type.Callback<string>): void;
}
