import { config, common } from '../index.js';

class NFError extends Error {
    constructor(...arg) {
        super(...arg);
        this.__stack = [];
        this.__detail = {};
    }

    stackPush(message, detail, stack) {
        this.__stack.push({ message, detail, stack });
    }

    setDetail(detail) {
        this.__detail = detail;
    }

    setMessage(message) {
        this.message = message;
    }

    json(options = {}) {
        const { checkDebugConfig = false } = options;
        if (!checkDebugConfig) {
            return {
                error: this.message,
                stack: this.stack,
                nfDetail: this.__detail,
                nfStack: this.__stack,
            };
        }
        const debugIncludeToResponse = common.getPath(config, 'debug.includeToResponse') || false;
        if (debugIncludeToResponse) {
            return {
                error: this.message,
                stack: this.stack,
                nfDetail: this.__detail,
                nfStack: this.__stack,
            };
        }
        return {
            error: this.message,
        };
    }
}

class NFUnauthorizedError extends NFError {}

export { NFError, NFUnauthorizedError };
