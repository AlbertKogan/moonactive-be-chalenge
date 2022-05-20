const fs = require('fs');
const fastify = require('fastify')({ logger: false });
const Redis = require("ioredis");
const port = +process.argv[2] || 3000;

const cardsData = fs.readFileSync('./cards.json');

// Considering that cards are unique
const cards = JSON.parse(cardsData);
const len = cards.length;

const luaScript = `
local key = KEYS[1]
local len = tonumber(KEYS[2])

redis.call("SETNX", key, -1)
local index = redis.call("INCR", key)

if index == len then
    return -1
end

return index
`;

const redis = new Redis();
redis.defineCommand("getCardIndex", {
    numberOfKeys: 2,
    lua: luaScript,
});

async function getMissingCard(key) {
    const index = await redis.getCardIndex(key, len);

    if (index === -1) return;

    return cards[index];
}

fastify.get('/card_add', async (req, res) => {
    const missingCard = await getMissingCard("user_id:" + req.query.id);

    if (missingCard === undefined){
        return res.send({id: "ALL CARDS"});
    }

    return res.send(missingCard);
})

fastify.get('/ready', async (req, res) => {
    res.send({ready: true})
})

const start = async () => {
    try {
        await fastify.listen(port)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
