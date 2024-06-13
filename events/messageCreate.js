const { EmbedBuilder, Events } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { v4 } = require('uuid');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const prism = require('prism-media');

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

        }
    }
};
