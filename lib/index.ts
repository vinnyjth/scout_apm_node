import * as Errors from "./errors";

import { scoutMiddleware as expressMiddleware } from "./express";

import { Scout, ScoutRequest, DoneCallback, SpanCallback, RequestCallback } from "./scout";
import { ScoutConfiguration, JSONValue, buildScoutConfiguration, consoleLogFn, buildWinstonLogFn } from "./types";
import { getIntegrationForPackage } from "./integrations";
import { getActiveGlobalScoutInstance, getOrCreateActiveGlobalScoutInstance, EXPORT_BAG } from "./global";

// Set up PG integration
// This is needed for use in Typescript projects since `import` will not
// run global code unless you do a whole-file import
function setupRequireIntegrations(packages: string[], scoutConfig?: Partial<ScoutConfiguration>) {
    packages = packages || [];

    packages.forEach(name => {
        const integration = getIntegrationForPackage(name);
        if (integration) {
            integration.ritmHook(EXPORT_BAG);
        }
    });
}

// For pure NodeJS contexts this will be run automatically
setupRequireIntegrations([
    // Databases
    "pg",
    "mysql",
    "mysql2",

    // Templating
    "pug",
    "mustache",
    "ejs",

    // Web frameworks
    "express",
    "nuxt",

    // NodeJS internals
    "http",
    "https",
]);

const API = {
    // Configuration building
    buildScoutConfiguration,

    Errors,

    // Ingetrations
    setupRequireIntegrations,
    expressMiddleware,

    // Logging
    consoleLogFn,
    buildWinstonLogFn,

    // Install scout
    install: getOrCreateActiveGlobalScoutInstance,

    // instrument
    instrument(op: string, cb: DoneCallback, scout?: Scout): Promise<any> {
        return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
            .then(scout => {
                return scout.instrument(op, (finishSpan, info) => {
                    return cb(finishSpan, info);
                });
            });
    },

    // instrument
    instrumentSync(op: string, cb: SpanCallback, scout?: Scout): Promise<any> {
        return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
            .then(scout => scout.instrumentSync(op, cb));
    },

    // API
    api: {
        WebTransaction: {
            run(op: string, cb: DoneCallback, scout?: Scout): Promise<any> {
                const name = `Controller/${op}`;
                return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
                    .then(scout => scout.transaction(name, (finishRequest, other) => {
                        return scout.instrument(name, (finishSpan, info) => {
                            return cb(finishRequest, info);
                        });
                    }));
            },

            runSync(op: string, cb: RequestCallback, scout?: Scout): any {
                const name = `Controller/${op}`;

                scout = scout || getActiveGlobalScoutInstance() || undefined;
                if (!scout) { return; }

                return scout.transactionSync(name, (request) => {
                    return cb(request);
                });
            },
        },

        BackgroundTransaction: {
            run(op: string, cb: DoneCallback, scout?: Scout): Promise<any> {
                const name = `Job/${op}`;
                return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
                    .then(scout => scout.transaction(name, (finishRequest, other) => {
                        return scout.instrument(name, (finishSpan, info) => {
                            return cb(finishRequest, info);
                        });
                    }));
            },

            runSync(op: string, cb: SpanCallback, scout?: Scout): any {
                const name = `Job/${op}`;

                scout = scout || getActiveGlobalScoutInstance() || undefined;
                if (!scout) { return; }

                return scout.instrumentSync(name, (span) => {
                    return cb(span);
                });
            },
        },

        instrument(op: string, cb: DoneCallback, scout?: Scout): Promise<any> {
            return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
                .then(scout => scout.instrument(op, (finishSpan, info) => {
                    return cb(finishSpan, info);
                }));
        },

        instrumentSync(operation: string, fn: SpanCallback, scout?: Scout) {
            return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
                .then(scout => scout.instrumentSync(operation, fn));
        },

        get Config() {
            const scout = getActiveGlobalScoutInstance();
            return scout ? scout.getConfig() : undefined;
        },

        Context: {
            add(name: string, value: JSONValue, scout?: Scout): Promise<ScoutRequest | void> {
                return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
                    .then(scout => {
                        const req = scout.getCurrentRequest();
                        if (!req) { return; }

                        return req.addContext(name, value);
                    });
            },

            addSync(name: string, value: JSONValue, scout?: Scout): ScoutRequest | undefined {
                scout = scout || getActiveGlobalScoutInstance() || undefined;
                if (!scout) { return; }

                const req = scout.getCurrentRequest();
                if (!req) { return; }

                return req.addContextSync(name, value);
            },
        },

        ignoreTransaction(scout?: Scout): Promise<ScoutRequest | void> {
            return (scout ? Promise.resolve(scout.setup()) : getOrCreateActiveGlobalScoutInstance())
                .then(scout => {
                    const req = scout.getCurrentRequest();
                    if (!req) { return; }

                    return Promise.resolve(req.ignore());
                });
        },

        ignoreTransactionSync(scout?: Scout): ScoutRequest | void {
            scout = scout || getActiveGlobalScoutInstance() || undefined;
            if (!scout) { return; }

            const req = scout.getCurrentRequest();
            if (!req) { return; }

            return req.ignore();
        },
    },
};

export = API;
