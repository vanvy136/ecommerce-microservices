const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../redis/client");

const createRedisStore = (prefix) => {
    return new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: prefix
    });
};

// General Rate Limiting: 100 requests / 15 minutes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    store: createRedisStore("rl:general:"),

    message: {
        success: false,
        message: "Too many requests"
    }
});

// Auth Rate Limiting: 20 requests / 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    store: createRedisStore("rl:auth:"),

    message: {
        success: false,
        message: "Too many authentication requests"
    }
});

module.exports = {
    generalLimiter,
    authLimiter
};