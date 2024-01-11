require('dotenv').config();
const { sep } = require("path");
const Discord = require('discord.js-selfbot-v13');
const fs      = require("fs");
const { getVoiceConnection } = require('@discordjs/voice');

const client = new Discord.Client({
    checkUpdate: false
});

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

client.on('ready', async () => {
    const load = (dir = "./Commands/") => {
		fs.readdirSync(dir).forEach(dirs => {
			const commands = fs.readdirSync(`${dir}${sep}${dirs}${sep}`).filter(f => f.endsWith(".js"));

			for (const f of commands) {
				const pull = require(`${dir}/${dirs}/${f}`);
				if (pull.help && typeof (pull.help.name) === "string") {
					if (client.commands.get(pull.help.name)) return console.warn(`⚠️ Two or more commands have the same name ${pull.help.name}.`);
					client.commands.set(pull.help.name, pull);
				} else {
					console.log(`⛔ Error loading command in ${dir}${dirs}. you have a missing help.name or help.name is not a string. or you have a missing help.category or help.category is not a string`);
					continue;
				}
				if (pull.help.aliases && typeof (pull.help.aliases) === "object") {
					pull.help.aliases.forEach(alias => {
						if (client.aliases.get(alias)) return console.warn(`⚠️ Two commands or more commands have the same aliases ${alias}`);
						client.aliases.set(alias, pull.help.name);
					});
				}
			}
		});
	};
	load();
    
    console.log(`Welcome to Sounarch's selfbot script!`);
    console.log(`Name: ${client.user.username}`);
    console.log(`ID: ${client.user.id}`);
});
  
client.on("messageCreate", async message => {
    if (message.author.id !== "1147963004386812025") return;
    const prefix = "!";
    
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    let command;

    if (!message.member) message.member = await message.guild.fetchMember(message.author);

    if (!message.content.toLowerCase().startsWith(prefix)) return;

    if (client.commands.has(cmd)) command = client.commands.get(cmd);
	else if (client.aliases.has(cmd)) command = client.commands.get(client.aliases.get(cmd));

    if (command) command.run(client, message, args);
});

client.login(process.env.TOKEN);