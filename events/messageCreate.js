const { EmbedBuilder, Events } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { v4 } = require('uuid');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const prism = require('prism-media');

let longResource;

buildEmbeds = (origMsg) => {

    const createdEmbeds = [];

    if (origMsg.embeds.length) {
        for (var ei=0; ei < origMsg.embeds.length; ei++) {

            //console.log(origMsg.embeds[ei]);

            let anEmbed = new EmbedBuilder()
                .setDescription(origMsg.content)
                .setTimestamp(origMsg.createdAt)
                .setTitle('dispander')
                .setURL(origMsg.url)
                .setAuthor({
                    "name": origMsg.author.username,
                    "iconURL": origMsg.author.avatarURL(),
                    "url": origMsg.jumpUrl
                })
                .setFooter({
                    text: origMsg.channel.name
                });

            if (origMsg.embeds[ei].data.thumbnail) {
                anEmbed.setImage(origMsg.embeds[ei].data.thumbnail.proxy_url);
            }

            createdEmbeds.push(anEmbed);
        }
    }

    return createdEmbeds;
}

module.exports = {
	name: Events.MessageCreate,
	once: false,
    isMatch(msg) {

        if (msg.author.bot) return;

        if (msg.content) {
            let msgMatch = msg.content.match(/https:\/\/discord.com\/channels\/(\d*)\/(\d*)\/(\d*)/);
            let chanMatch = msg.content.match(/<#\d{19}>/g);
            return msgMatch || chanMatch;
        }
    },
	execute(msg) {

        let msgMatch = msg.content.match(/https:\/\/discord.com\/channels\/(\d*)\/(\d*)\/(\d*)/);
        let chanMatch = msg.content.match(/<#\d{19}>/g);
            
        let dispandedMsg = {};
        if (msgMatch) { 
            const channel = msg.client.channels.cache.get(msgMatch[2]);
            channel.messages.fetch(msgMatch[3])
            .then((message) => {
                
                dispandedMsg.content = message.content || '.';
                dispandedMsg.attachments = message.attachments;

                if (message.embeds.length) {
                    
                    msg.channel.send({ embeds: buildEmbeds(message) });
                    console.log(chanMatch);
                    for (var ri=0; ri<chanMatch.length; ri++) {
                        let theChan = msg.client.channels.cache.get(chanMatch[ri].substring(2,21));
                        if (theChan) {
                            theChan.send({ embeds: buildEmbeds(message), ...dispandedMsg });
                        }
                    }
                } else {
                    console.log(dispandedMsg);
                    msg.channel.send(dispandedMsg);
                }
            })
            .catch((error) => {
                console.error(`Could not fetch message:`);
                console.error(error);
            });

        } else if (chanMatch && !msgMatch) {

            dispandedMsg.content = msg.content;
            for (var ri=0; ri<chanMatch.length; ri++) {
                let theChan = msg.client.channels.cache.get(chanMatch[ri].substring(2,21));
                if (theChan) {
                    theChan.send({ content: msg.url });
                    theChan.send({ embeds: buildEmbeds(msg), ...dispandedMsg });
                }
            }

        } else if (msg.content.toLowerCase() === '!talk') {

            if (msg.member.voice.channel) {
                const connection = joinVoiceChannel({
                    channelId: msg.member.voice.channel.id,
                    guildId: msg.guild.id,
                    adapterCreator: msg.guild.voiceAdapterCreator,
                });

            } else {

                msg.reply('You need to join a voice channel first!');
            }

        } else if (msg.content.toLowerCase().startsWith('!vol')) {
/*
            if (!longResource)
                return;

            let volParts = msg.content.split(' ');

            longResource.volume.setVolume(volParts[1]);
*/
        } else if (msg.content.toLowerCase().startsWith('!play')) {

            const connection = joinVoiceChannel({
                channelId: msg.member.voice.channel.id,
                guildId: msg.guild.id,
                adapterCreator: msg.guild.voiceAdapterCreator,
            });

            let talkFilter = msg.content.replace('&&', '');
            let talkParams = talkFilter.split(' ');

            if (!talkParams[1])
                return;

            const volVal = talkParams[2] || '-20dB';

            const command = `yt-dlp -o "%(id)s.mp3" --print "%(id)s" -x --download-archive downloaded.txt --format bestaudio --extract-audio --audio-format mp3 ${talkParams[1]}`;
            console.log(command);
            const output = execSync(command, {
                encoding: 'utf-8',
                cwd: path.join(__dirname, '..', 'dl_files')
            });

            const filename = output.substring(0,output.length-1) + '.mp3';
            console.log(output);

            const player = createAudioPlayer();
            
            const dlOutput = execSync(`yt-dlp -o "%(id)s.mp3" -x --download-archive downloaded.txt --format bestaudio --extract-audio --audio-format mp3 ${talkParams[1]}`, {
                encoding: 'utf-8',
                cwd: path.join(__dirname, '..', 'dl_files')
            });
            console.log(dlOutput,  path.join(__dirname, '..', 'dl_files', filename));

            const alreadyFound = dlOutput.match(/\[Youtube\] ([\D\d]*): has already been recorded in the archive/);

            const input = fs.createReadStream(path.join(__dirname, '..', 'dl_files', alreadyFound ? alreadyFound[1]+'.mp3' : filename));
            const ffmpeg = new prism.FFmpeg({
                args: [
                    '-analyzeduration', '0',
                    '-loglevel', '0',
                    '-f', 'mp3',
                    '-i', 'pipe:0',
                    '-ac', '2',
                    '-ar', '48000',
                    '-f', 's16le',
                    '-af', `volume=${volVal}`,  // Adjust volume here
                ],
            });
            const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
            const resource = createAudioResource(input.pipe(ffmpeg).pipe(opus), { inlineVolume: true });
            longResource = resource;
            player.play(resource);
            connection.subscribe(player);

            //player.on('idle', () => connection.destroy());
            
        }
    }
};
