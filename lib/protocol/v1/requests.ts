import { v4 as uuidv4 } from "uuid";

import * as Constants from "../../constants";
import * as Errors from "../../errors";
import { BaseAgentRequest, AgentRequestType, APIVersion, CoreAgentVersion, JSONValue } from "../../types";

export class V1GetVersionRequest extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1GetVersion;

    constructor() {
        super();
        this.json = {CoreAgentVersion: {}};
    }
}

export class V1Register extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1Register;

    constructor(app: string, key: string, version: APIVersion) {
        super();
        this.json = {
            Register: {
                api_version: version,
                app,
                key,
            },
        };
    }
}

export class V1StartRequest extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1StartRequest;

    public readonly requestId: string;
    public readonly timestamp: Date;

    constructor(opts?: {requestId?: string, timestamp?: Date}) {
        super();
        const prefix = Constants.DEFAULT_REQUEST_PREFIX;

        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();
        this.requestId = opts && opts.requestId ? opts.requestId : `${prefix}${uuidv4()}`;

        this.json = {
            StartRequest: {
                request_id: this.requestId,
                timestamp: this.timestamp,
            },
        };
    }
}

export class V1FinishRequest extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1FinishRequest;

    public readonly requestId: string;
    public readonly timestamp: Date;

    constructor(requestId: string, opts?: {timestamp?: Date}) {
        super();
        this.requestId = requestId;
        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();

        this.json = {
            FinishRequest: {
                request_id: this.requestId,
                timestamp: this.timestamp,
            },
        };
    }
}

export class V1TagRequest extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1TagRequest;

    public readonly requestId: string;
    public readonly timestamp: Date;

    constructor(
        tagName: string,
        tagValue: JSONValue | JSONValue[],
        requestId: string,
        opts?: {timestamp?: Date},
    ) {
        super();
        this.requestId = requestId;
        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();

        this.json = {
            TagRequest: {
                request_id: this.requestId,
                tag: tagName,
                timestamp: this.timestamp,
                value: tagValue,
            },
        };
    }
}

export class V1StartSpan extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1StartSpan;

    public readonly requestId: string;
    public readonly spanId: string;
    public readonly timestamp: Date;
    public readonly operation: string;
    public readonly parentId?: string;

    constructor(
        operation: string,
        requestId: string,
        opts?: {
            spanId?: string,
            parentId?: string,
            timestamp?: Date,
        },
    ) {
        super();
        this.requestId = requestId;
        this.operation = operation;
        this.parentId = opts && opts.parentId ? opts.parentId : undefined;

        const prefix = Constants.DEFAULT_SPAN_PREFIX;

        this.spanId = opts && opts.spanId ? opts.spanId : `${prefix}${uuidv4()}`;
        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();

        this.json = {
            StartSpan: {
                operation,
                parent_id: this.parentId,
                request_id: this.requestId,
                span_id: this.spanId,
                timestamp: this.timestamp,
            },
        };
    }
}

export class V1StopSpan extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1StopSpan;

    public readonly requestId: string;
    public readonly spanId: string;
    public readonly timestamp: Date;

    constructor(
        spanId: string,
        requestId: string,
        opts?: {
            timestamp?: Date,
        },
    ) {
        super();
        this.requestId = requestId;
        this.spanId = spanId;
        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();

        this.json = {
            StopSpan: {
                request_id: this.requestId,
                span_id: this.spanId,
                timestamp: this.timestamp,
            },
        };
    }
}

export class V1TagSpan extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1TagSpan;

    public readonly requestId: string;
    public readonly spanId: string;
    public readonly timestamp: Date;
    public readonly tagName: string;
    public readonly tagValue: JSONValue | JSONValue[];

    constructor(
        tagName: string,
        tagValue: JSONValue | JSONValue[],
        spanId: string,
        requestId: string,
        opts?: {
            timestamp?: Date,
        },
    ) {
        super();
        this.requestId = requestId;
        this.spanId = spanId;
        this.tagName = tagName;
        this.tagValue = tagValue;

        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();

        this.json = {
            TagSpan: {
                request_id: this.requestId,
                span_id: this.spanId,
                tag: this.tagName,
                timestamp: this.timestamp,
                value: this.tagValue,
            },
        };
    }
}

export class V1ApplicationEvent extends BaseAgentRequest {
    public readonly type: AgentRequestType = AgentRequestType.V1ApplicationEvent;

    public readonly source: string;
    public readonly eventType: string;
    public readonly eventValue: JSONValue;
    public readonly timestamp: Date;

    constructor(
        source: string,
        eventType: string,
        eventValue: JSONValue | JSONValue[],
        opts?: {
            timestamp?: Date,
        },
    ) {
        super();
        this.source = source;
        this.eventType = eventType;
        this.eventValue = eventValue;

        this.timestamp = opts && opts.timestamp ? opts.timestamp : new Date();

        this.json = {
            ApplicationEvent: {
                event_type: this.eventType,
                event_value: this.eventValue,
                source,
                timestamp: this.timestamp,
            },
        };
    }
}
