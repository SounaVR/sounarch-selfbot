const { exec } = require('child_process');
const { createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, createAudioResource, joinVoiceChannel, getVoiceConnection, StreamType } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const fs = require('fs');

let queue = new Map();
let player;
let connection;

exports.run = async (client, message, args) => {
    const serverQueue = queue.get(message.guild.id);

    switch (args[0]) {
        case "join": case "j":
            joinVoiceChannel({
                channelId: "1190025807683387482",
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });

            connection = getVoiceConnection(message.guild.id);

            message.channel.send(`✅ Successfully joined voice channel: <#${connection.joinConfig.channelId}> 😎`);
            break;
    
        case "leave": case "l":
            let channelid = connection.joinConfig.channelId;
            connection.destroy();
            message.channel.send(`✅ Successfully left voice channel: <#${channelid}> 👋`);
            break;

        case "play": case "p":
            if (connection) {
                const query = message.content.slice("5");
                search(query);
            }
            break;
        
        case "stop": case "s":
            if (connection) {
                queue.delete(message.guild.id);
                message.channel.send("⏹️ Music stopped.");
                player.stop();
            }
            break;

        case "pause": case "pa":
            if (connection) {
                player.pause();
                message.channel.send("⏸️ Music paused.");
            }
            break;

        case "resume": case "r":
            if (connection) {
                player.unpause();
                message.channel.send("▶️ Music resumed.");
            }
            break;

        case "queue": case "q":
            if (!serverQueue || !serverQueue.songs.length) message.channel.send(":x: Queue is empty.");
            else {
                const queue = generateQueue(serverQueue.songs);

                message.channel.send(queue[0].join("\n"));
            }
            break;

        case "skip":
            if (connection) {
                message.channel.send("⏭️ Music skipped.");
                player.stop();
            }
            break;  
    }

    function search(query) {
        exec(`printf '%s' "${query}" | tr ' ' '+'`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            //curl -s https://invidious.fdn.fr/search\?q\=${stdout} | grep -Eo "watch\?v=.{11}"
            exec(`curl 'https://invidious.fdn.fr/search?q=${stdout}' \
            -H 'authority: invidious.fdn.fr' \
            -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
            -H 'accept-language: en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7' \
            -H 'dnt: 1' \
            -H 'referer: https://invidious.fdn.fr/search?q=${stdout}' \
            -H 'sec-ch-ua: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"' \
            -H 'sec-ch-ua-mobile: ?0' \
            -H 'sec-ch-ua-platform: "Windows"' \
            -H 'sec-fetch-dest: document' \
            -H 'sec-fetch-mode: navigate' \
            -H 'sec-fetch-site: same-origin' \
            -H 'sec-fetch-user: ?1' \
            -H 'upgrade-insecure-requests: 1' \
            -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \
            --compressed >> output.txt`, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                
                try {
                    const data = fs.readFileSync('output.txt', 'utf-8');
                    const query = data.match(/watch\?v=.{11}/gm)[0];
                    let youtube_url = `https://youtube.com/${query}`;
                    fs.unlink('output.txt', (err) => {
                        if (err) throw err;
                    });

                    const songInfos = await ytdl.getInfo(youtube_url);

                    let song = {
                        title: songInfos.videoDetails.title,
                        url: songInfos.videoDetails.video_url
                    }

                    if (!serverQueue || !serverQueue.songs.length) {
                        const constructor = {
                            songs: []
                        }
                        queue.set(message.guild.id, constructor);

                        constructor.songs.push(song);
                        message.channel.send(`✅ The following song has been added: [${song.title}](<${song.url}>)`);
                        
                        const audioPlayer = createAudioPlayer({
                            behaviors: {
                                noSubscriber: NoSubscriberBehavior.Pause,
                            }
                        });
                        connection.subscribe(audioPlayer);

                        player = audioPlayer;
                        play(song);

                        player.on(AudioPlayerStatus.Idle, () => {
                            const serverQueue = queue.get(message.guild.id);

                            if (!serverQueue) return;

                            serverQueue.songs.shift();
                            if (serverQueue.songs.length) play(serverQueue.songs[0]);
                        });
                    } else {
                        serverQueue.songs.push(song);
                        return message.channel.send(`✅ The following song has been added: [${song.title}](<${song.url}>)`);
                    }           
                } catch (err) {
                    console.error(err);
                }
            });
        });
    }

    async function play(song) {
        const stream = ytdl(song.url, { filter: 'audioonly' });
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

        player.play(resource);

        message.channel.send(`🎵 Playing [${song.title}](<${song.url}>)`);
    }

    function generateQueue(queue) {
        const uwu = [];
        let k = 10;
        for (let i = 0; i < queue.length; i += 10) {
            const current = queue.slice(i, k);
            let j = i;
            k += 10;
            const info = current.map(track => `${++j}. **[${track.title}](<${track.url}>)**`);

            uwu.push(info)
        }

        return uwu;
    }
};

exports.help = {
    name: "music",
    aliases: ["m"]
};