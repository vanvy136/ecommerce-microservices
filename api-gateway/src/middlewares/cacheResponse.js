const redisClient = require("../redis/client");

async function cacheResponse(req, res, next) {
    if (!redisClient.isReady) {
        return next();
    }

    const key = `gateway:cache:${req.originalUrl}`;

    try {
        const cached = await redisClient.get(key);

        if (cached) {
            res.setHeader("X-Cache", "HIT");
            return res.json(JSON.parse(cached));
        }

        res.setHeader("X-Cache", "MISS");

        const originalJson = res.json.bind(res);

        res.json = function (data) {
            if (res.statusCode === 200) {
                redisClient.setEx(
                    key,
                    60,
                    JSON.stringify(data)
                ).catch(console.error);
            }

            return originalJson(data);
        };

        next();
    } catch (error) {
        console.error("Cache error:", error.message);
        next();
    }
}

module.exports = cacheResponse;
