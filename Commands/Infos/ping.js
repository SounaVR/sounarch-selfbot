exports.run = async (client, message, args) => {
    const m = await message.channel.send("Ping ?");
    const ping = Math.round(m.createdTimestamp - message.createdTimestamp);
    m.edit(`
        P${'o'.repeat(Math.min(Math.round(ping / 100), 1500))}ng! \nLatence ► ${ping}ms.\nAPI Discord ► ${Math.round(client.ws.ping)}ms.`);
};

exports.help = {
    name: "ping"
};