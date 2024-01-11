const { exec } = require ('child_process');
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
                channelId: args[1],
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });

            connection = getVoiceConnection(message.guild.id);

            message.edit(`Successfully joined voice channel: <#${connection.joinConfig.channelId}>`);
            break;
    
        case "leave": case "l":
            let channelid = connection.joinConfig.channelId;
            connection.destroy();
            message.edit(`Successfully left voice channel: <#${channelid}>`);
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
                message.edit("Music stopped.");
            }
            break;

        case "pause": case "pa":
            if (connection) {
                player.pause();
                message.edit("Music paused.");
            }
            break;

        case "resume": case "r":
            if (connection) {
                player.unpause();
                message.edit("Music resumed.");
            }
            break;

        case "queue": case "q":
            if (!serverQueue) message.edit("Queue is empty.");
            else {
                console.log("server queue " + JSON.stringify(serverQueue));
            }
            break;

        case "skip":
            if (connection) {
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
                        message.edit(`The following song has been added: ${song.title}`);
                        
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

                            serverQueue.songs.shift();
                            if (serverQueue.songs.length) play(serverQueue.songs[0]);
                        });
                    } else {
                        serverQueue.songs.push(song);
                        return message.edit(`The following song has been added: ${song.title}`);
                    }           
                } catch (err) {
                    console.error(err);
                }
            });
        });
    }

    function play(song) {
        const stream = ytdl(song.url, { filter: 'audioonly' });
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        player.play(resource);

        message.channel.send(`Playing \`${song.title}\``);
    }
};

exports.help = {
    name: "music",
    aliases: ["m"]
};