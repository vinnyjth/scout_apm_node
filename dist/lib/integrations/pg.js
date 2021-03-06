"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const integrations_1 = require("../types/integrations");
const types_1 = require("../types");
// Hook into the express and mongodb module
class PGIntegration extends integrations_1.RequireIntegration {
    constructor() {
        super(...arguments);
        this.packageName = "pg";
    }
    shim(pgExport) {
        // Shim client
        pgExport = this.shimPGConnect(pgExport);
        pgExport = this.shimPGQuery(pgExport);
        // Add the integration symbol to the client class itself
        pgExport.Client[integrations_1.getIntegrationSymbol()] = this;
        return pgExport;
    }
    /**
     * Shim for pg's `connect` function
     *
     * @param {any} pgExport - pg's exports
     */
    shimPGConnect(pgExport) {
        const Client = pgExport.Client;
        const originalConnectFn = Client.prototype.connect;
        const integration = this;
        const fn = function (userCallback) {
            integration.logFn("[scout/integrations/pg] Connecting to Postgres db...", types_1.LogLevel.Trace);
            // If a callback was specified we need to do callback version
            if (userCallback) {
                return originalConnectFn.apply(this, [
                    (err, connection) => {
                        if (err) {
                            integration.logFn("[scout/integrations/pg] Connection to Postgres db failed", types_1.LogLevel.Trace);
                            userCallback(err, connection);
                            return;
                        }
                        userCallback(undefined, connection);
                    },
                ]);
            }
            // Promise version
            return originalConnectFn.apply(this, [])
                .then(() => {
                integration.logFn("[scout/integrations/pg] Successfully connected to Postgres db", types_1.LogLevel.Trace);
            })
                .catch(err => {
                integration.logFn("[scout/integrations/pg] Connection to Postgres db failed", types_1.LogLevel.Trace);
                // Re-throw error
                throw err;
            });
        };
        Client.prototype.connect = fn;
        return pgExport;
    }
    /**
     * Shim for pg's `query` function
     *
     * @param {any} pgExport - pg's exports
     */
    shimPGQuery(pgExport) {
        const Client = pgExport.Client;
        const Query = pgExport.Query;
        const originalQueryFn = Client.prototype.query;
        const integration = this;
        // By the time this function runs we *should* have a scout instance set.
        const fn = function (config, values, userCallback) {
            const originalArgs = arguments;
            integration.logFn("[scout/integrations/pg] Querying Postgres db...", types_1.LogLevel.Trace);
            // If no scout instsance or the query is undefined go straight to pg
            if (!integration.scout || !config) {
                return originalQueryFn.apply(this, originalArgs);
            }
            // Detect what kind of query is being used
            // https://github.com/brianc/node-postgres/blob/master/packages/pg/lib/client.js
            const query = typeof config.submit === "function" ? config : new Query(...originalArgs);
            return integration.scout.instrument(types_1.ScoutSpanOperation.SQLQuery, done => {
                // If integration.scout is missing by the time this runs, exit
                if (!integration.scout) {
                    integration.logFn("[scout/integrations/pg] Failed to find integration's scout instance", types_1.LogLevel.Warn);
                    return originalQueryFn.apply(this, [config, values, userCallback])
                        .then(() => done());
                }
                const span = integration.scout.getCurrentSpan();
                // If we weren't able to get the span we just started, something is wrong, do the regular call
                if (!span) {
                    integration.logFn("[scout/integrations/pg] Unable to get current span", types_1.LogLevel.Debug);
                    return originalQueryFn.apply(this, [config, values, userCallback])
                        .then(() => done());
                }
                let queryResult;
                return span
                    // Update span context with the DB statement
                    .addContext(types_1.ScoutContextName.DBStatement, query.text)
                    // Run pg's query function, saving the result
                    .then(() => originalQueryFn.apply(this, originalArgs))
                    .then(r => queryResult = r)
                    // Finish the instrumentation
                    .then(() => done())
                    .then(() => integration.logFn("[scout/integrations/pg] Successfully queried Postgres db", types_1.LogLevel.Trace))
                    .then(() => queryResult)
                    .catch(err => {
                    // Finish the instrumentation ASAP
                    done();
                    // Mark the span as errored, we assume that the span won't be sent before this line can run
                    // otherwise the context would miss it's window to be sent
                    if (span) {
                        span.addContext(types_1.ScoutContextName.Error, "true");
                    }
                    integration.logFn("[scout/integrations/pg] Query failed", types_1.LogLevel.Trace);
                    // Rethrow the error
                    throw err;
                });
            });
        };
        Client.prototype.query = fn;
        return pgExport;
    }
}
exports.PGIntegration = PGIntegration;
exports.default = new PGIntegration();
