const config = require('./config.json');

const Discord = require('discord.js');
const client = new Discord.Client();

const extras = require('./extras.js');

const removeMd = require('remove-markdown');

var request = require('request');

var apiai = require('apiai');
var ai = apiai(config.apiai_token);

const util = require('util');
const crypto = require('crypto');

var fish = ['🐠', '🐟', '🐡', '🐬', '🐳', '🐋'];

const githubregex = /http(?:s|):\/\/github\.com\/(.*?\/.*?\/)blob\/(.*?)\/(.*?)#L([0-9]+)-?L?([0-9]+)?/;
const fileendregex = /.*\.([a-zA-Z0-9]*)/;

var firstrun = 1;

var readyspam = 0;

client.on('ready', () => {
  client.user.setStatus('online');
  console.log('Everything connected!');
  client.user.setActivity(`-> ${config.prefix}help <-`);
  if (readyspam == 0) {
    readyspam = 1;
    setTimeout(function() {
      readyspam = 0;
    }, 3000);
  } else {
    console.error("Stopping due to client-ready spam, please restart the bot!");
    process.exit(0);
  }
});

client.on('message', message => {
  if (message.author.bot) return;
  if (config.blockedusers.includes(message.author.id)) return;
  if (!message.guild) return;
  if (message.content.startsWith(config.prefix)) {

    const args = message.content.slice(config.prefix.length).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (config.blocked.includes(cmd)) return;

    console.log(`> "${cmd}" by "${message.author.tag}" on "${message.guild.name}"`);

    if (message.guild.id == config.mainguild) {
      var juice = message.guild.emojis.get(config.juiceid);
      if (!fish.includes(juice)) {
        fish.push(juice);
      }
    }

    var commandsuccess = true;
    switch (cmd) {
      case 'randomsofe':
        var sofehex = Math.floor(Math.random() * 16777215).toString(16);
        var sofebghex = Math.floor(Math.random() * 16777215).toString(16);
        var rot = getrandrot();
        makesofe(message, sofehex, sofebghex, rot);
        break;

      case 'makesofe':
        if (message.content.includes('#')) {
          message.reply("Please don't use #'s or any other symbols for the hex codes in this command!");
        } else if (args[0] && args[1] && !args[2]) {
          var fhex = args[0];
          var bhex = args[1];
          makesofe(message, fhex, bhex);
        } else if (args[0] && args[1] && args[2]) {
          var fhex = args[0];
          var bhex = args[1];
          var rot = args[2];
          makesofe(message, fhex, bhex, rot);
        } else {
          message.reply(`Usage: ${config.prefix}makesofe <hexcode> <hexcode for background> [rotation in degrees]\nExample: ${config.prefix}makesofe FFEE00 FFFFFF 90`);
        }
        break;

      case 'say':
        message.delete();
        if (message.guild.id === '373199722573201408' || message.guild.id === '402639859535052811') {
          message.member.send("You can't tell me what to say on this server, I will tell you in private:\n" + args.join(' '));
          return;
        }
        if(message.mentions.everyone ||
          message.content.includes("@everyone") ||
          message.content.includes("@here")
        ){
          message.reply("You cannot mention everyone/here");
          break;
        }
        message.channel.send(args.join(' '));
        break;

      case '8ball':
        var rnd = Math.floor(Math.random() * config.eightball.length);
        message.reply(config.eightball[rnd]);
        break;

      case 'weather':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}weather <city>\nExample: ${config.prefix}weather London`);
          return;
        }
        getweather(args[0], message);
        break;

      case 'cat':
        getcat(message);
        break;

      case 'fish':
        var cfish = fish[Math.floor(Math.random() * fish.length)];
        message.reply('You caught a ' + cfish + '.');
        message.react(cfish);
        break;

      case 'whoami':
        sendEmbed(message.channel, whois(message.member, false));
        break;

      case 'whois':
        if (message.mentions.members.first() != undefined) {
          sendEmbed(message.channel, whois(message.mentions.members.first()));
        } else {
          message.reply(`Member not found!\nCommand Usage: ${config.prefix}whois @mentionOfaUser`);
        }
        break;

      case 'eval':
        if (message.author.id == config.ownerid) {
          try {
            var estart = process.hrtime();
            var evaled = eval(args.join(' '));
            var eend = process.hrtime(estart);
            var tm = '*Executed in ' + (eend[0] * 1000 + eend[1] / 1000000) + ' ms.*\n';
            if (typeof evaled === 'object') {
              var mtd = message.channel.send(sendLong(tm + "\`\`\`\n" + util.inspect(evaled).replace(config.discordtoken, '<TOKEN HAS BEEN HIDDEN>') + "\n\`\`\`", 1992, 2000));
            } else if (typeof evaled === "undefined") {
              var mtd = message.channel.send(tm + "\`\`\`\n" + typeof undefined + "\n\`\`\`");
            } else if (evaled == null) {
              var mtd = message.channel.send(tm + "\`\`\`\n" + null + "\n\`\`\`");
            } else {
              var mtd = message.channel.send(sendLong(tm + "\`\`\`\n" + evaled.toString().replace(config.discordtoken, '<TOKEN HAS BEEN HIDDEN>') + "\n\`\`\`", 1992, 2000));
            }
            mtd.then(function(msg) {
              if (typeof evaled !== 'undefined') {
                if (typeof evaled.then == 'function') {
                  msg.delete(10000);
                }
              }
            });
          } catch (err) {
            if (err !== null && typeof err === 'object') {
              err = util.inspect(err);
            }
            message.channel.send(":x: Error!\n\`\`\`\n" + err.replace(config.discordtoken, '<TOKEN HAS BEEN HIDDEN>') + "\n\`\`\`").then(function(msg) {
              msg.delete(10000);
            });
          }
        } else {
          message.reply("You ain't doing that!");
        }
        break;

      case 'reboot':
        if (message.author.id == config.ownerid) {
          message.reply('Restarting!').then(function() {
            console.log('Restarted by ' + message.author.username);
            process.exit(0);
          });
          message.reply('Restarting!');
        } else {
          message.reply("You ain't doing that!");
        }
        break;

      case 'googlepic':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}googlepic <search term>`);
        } else {
          message.channel.startTyping();
          var oargs = JSON.parse(JSON.stringify(args));
          if (args[args.length - 2] == "-r" && !isNaN(args[args.length - 1])) {
            args.splice(args.length - 2, 2);
            var ri = oargs[oargs.length - 1];
          } else {
            ri = 1;
          }
          googlepic(args.join(' '), message, ri);
          message.channel.stopTyping();
        }
        break;

      case 'poggit':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}poggit <plugin name>`);
        } else {
          message.channel.startTyping();
          searchpoggit(args[0], message);
          message.channel.stopTyping();
        }
        break;

      case 'channels':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}channels <text|voice>`);
        } else {
          var clist = message.guild.channels.cache.map((c) => {
            if (c.type == args[0].toLowerCase()) {
              return c.toString();
            }
          }).join(' ');
          if (clist == "") clist = 'No channels of this type were found';
          message.reply(clist);
        }
        break;

      case 'chuck':
        getchuck(message);
        break;

      case 'ai':
        message.channel.startTyping();
        var air = ai.textRequest(args.join(' '), {
          sessionId: gsessionid(message, "member")
        });

        air.on('response', function(r) {
          message.reply(r.result.fulfillment.speech);
          if (!r.result.actionIncomplete) {
            switch (r.result.action) {
              case "web.search":
                switch (r.result.parameters.engine) {
                  case "Google Images":
                    googlepic(r.result.parameters.q, message);
                    break;
                  case "Poggit":
                    searchpoggit(r.result.parameters.q, message);
                    break;
                  default:
                    break;
                }
                break;
              case "weather":
                getweather(r.result.parameters['geo-city'], message);
                break;
              case "give":
                switch (r.result.parameters.item) {
                  case "random SOFe":
                    var sofehex = Math.floor(Math.random() * 16777215).toString(16);
                    var sofebghex = Math.floor(Math.random() * 16777215).toString(16);
                    var rot = getrandrot();
                    makesofe(message, sofehex, sofebghex, rot);
                    break;
                  case "Chuck Norris fact":
                    getchuck(message);
                    break;
                  case "cat":
                    getcat(message);
                    break;
                  default:
                    break;
                }
                break;
              default:
                break;
            }
          }
        });

        air.on('error', function(e) {
          console.log(e);
          message.reply("An error occured while accessing the api.ai API!");
        });

        air.end();
        message.channel.stopTyping();
        break;

      case 'issue':
      case 'pr':
        var repo;
        var number;
        if ((message.guild.id == '287339519500353537' || message.guild.id == '373199722573201408') && !args[1]) {
          if (!args[0]) {
            message.reply(`Usage: ${config.prefix}issue <number> or ${config.prefix}issue <repo> <number>\nExample: ${config.prefix}issue boxofdevs/commandshop 2`);
            return;
          }
          repo = 'pmmp/pocketmine-mp';
          number = args[0];
        } else {
          if (!args[1]) {
            message.reply(`Usage: ${config.prefix}issue <repo> <number>\nExample: ${config.prefix}issue boxofdevs/commandshop 2`);
            return;
          }
          repo = args[0];
          number = args[1];
        }
        if (isNaN(number)) {
          message.reply(`Usage: ${config.prefix}issue <repo> **<number>**\nExample: ${config.prefix}issue boxofdevs/commandshop **2**`);
        } else {
          message.channel.startTyping();
          gitIssue(repo, Math.floor(number), message);
          message.channel.stopTyping();
        }
        break;

      case 'poll':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}poll <title|choice1|choice2|choice3|...> [optional: time in seconds]\nExample: What do you prefer?|Potatoes|Trains|Turtles|Juice boxes`);
        } else {
          if (!isNaN(args[args.length - 1])) {
            var time = Math.floor(args[args.length - 1]);
            args.pop();
          } else {
            time = 0;
          }
          var newargs = args.join(' ').split('|');
          if (newargs.length < 3) {
            message.reply('There need to be at least 2 choices and a title!');
          } else if (newargs.length > 21) {
            message.reply("Because of limitation in reaction count on Discord you can't have more than 20 choices on a poll, sorry.");
          } else {
            var choices = newargs.splice(1);
            var poll = new Discord.MessageEmbed().setTitle('Poll: ' + newargs[0]).setAuthor(message.author.username, message.author.displayAvatarURL()).setTimestamp(new Date());
            message.channel.send({
              embed: poll.setDescription("Hold on, processing reactions...\n**Don't vote yet!**")
            }).then(function(msg) {
              reactionPoll(choices.length, msg).then(function({reactions, messageReactions}) {
                var polltext = "";
                choices.forEach(function(c, i) {
                  polltext += config.reaction_alphabet[i] + ' ' + c + '\n';
                });
                msg.edit({
                  embed: poll.setDescription(polltext).setFooter('Click one of the reactions to vote!', 'https://himbeer.me/images/logo-monochrome.png')
                }).then(function(msg) {
                  if (time !== 0 && time >= 5 && time <= 3600) {
                    msg.edit({
                      embed: poll.addField("Notice:", "Poll will end in " + time + " seconds")
                    }).then(function(msg) {
                      client.setTimeout(function() {
                        var result = "**Results:**\n";
                        messageReactions.forEach(function(r, i) {
                          try {
                            result += reactions[i] + ' ' + choices[i] + ": " + (r.count - 1) + ' votes\n';
                          } catch (err) {
                            result += 'Error\n';
                          }
                        });
                        poll = poll.setDescription(result).setFooter('Poll ended!', 'https://himbeer.me/images/logo-monochrome.png').setTitle('Poll: ' + newargs[0] + ' (ended)');
                        poll.fields = [];
                        msg.edit({
                          embed: poll
                        });
                      }, time * 1000);
                    });
                  } else if (time !== 0) {
                    message.reply('Time must me number between 5 and 3600!');
                  }
                });
              }).catch(err => {
                var errexplain = '';
                if (err.message == 'Maximum number of reactions reached (20)') {
                  errexplain = "Reason: There were already 20 reactions on that message (can't fit more than 20 per message).\nHint: If you are a server owner you can remove the permission to react from other people while the bot is reacting.";
                } else {
                  console.log(err);
                  errexplain = "Unknown error, this has been logged and the bot creator will take a look at the issue";
                }
                msg.edit({
                  embed: poll.setDescription('There was an error while processing reactions:\n' + errexplain).setFooter("I'm sorry :/")
                });
              });
            });
          }
        }
        break;

      case 'info':
      case 'status':
      case 'invite':
        var seconds = process.uptime();
        days = Math.floor(seconds / 86400);
        seconds %= 86400;
        hrs = Math.floor(seconds / 3600);
        seconds %= 3600;
        mins = Math.floor(seconds / 60);
        secs = seconds % 60;
        var uptime = days + ' Days, ' + hrs + ' Hours, ' + mins + ' Minutes and ' + Math.round(secs) + ' Seconds';
        var stats = new extras.SubFields()
          .addField('Servers', client.guilds.cache.size)
          .addField('Channels', client.channels.cache.size)
          .addField('Cached Users', client.users.cache.size)
          .addField('Uptime', uptime)
          .addField('RAM Usage', Math.round(process.memoryUsage().rss / 10485.76) / 100 + ' MB')
          .toString();
        var status = new Discord.MessageEmbed()
          .setColor(Math.floor(Math.random() * 16777215))
          .setTitle('MagicalHourglass Information:')
          .setDescription('MagicalHourglass is an open source Discord bot written in Node.js and originally made for the BoxOfDevs Discord Server.')
          .setThumbnail('https://himbeer.me/images/logo-monochrome.png')
          .addField('GitHub:', 'https://github.com/HimbeersaftLP/MagicalHourglass')
          .addField('Author:', 'HimbeersaftLP#8553')
          .addField('Invite:', '[Click Here](https://discordapp.com/oauth2/authorize?client_id=305631536852631552&scope=bot&permissions=1144384577)')
          .addField('Stats:', stats);
        sendEmbed(message.channel, status);
        break;

      case 'convert':
        if (!args[2] | isNaN(args[0])) {
          message.reply(`Usage: ${config.prefix}convert <amount> <from> <to>\nExample: ${config.prefix}convert 2 btc usd`);
        } else {
          currencyConvert(args[0], args[1], args[2]).then(function(conv) {
            if (isNaN(conv)) {
              var desc = conv;
            } else {
              var desc = 'Converted from: ' + args[1].toUpperCase() + '\nConversion result: ' + (Math.round(conv * 10000) / 10000) + ' ' + args[2].toUpperCase();
            }
            var convres = extras.embed('Conversion result:', desc, 'http://i.imgur.com/qbeZJNk.png')
              .setFooter('api.cryptonator.com', 'http://i.imgur.com/qbeZJNk.png')
              .setURL('https://www.cryptonator.com/');
            sendEmbed(message.channel, convres);
          });
        }
        break;

      case 'mock':
      case '<:mock:412317398050275329>':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}mock <text>\nExample: ${config.prefix}mock How do I open Discord`);
        } else {
          var beforemock = args.join(' ');
          var mocked = '';
          for (var i = 0; i < beforemock.length; i++) {
            mocked += (Math.random() >= 0.5) ? beforemock[i].toUpperCase() : beforemock[i].toLowerCase();
          }
          message.channel.send(message.author.toString() + ": " + mocked);
        }
        break;

      case 'clap':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}clap <text>\nExample: ${config.prefix}clap That is great`);
        } else {
          message.channel.send(message.author.toString() + ": " + args.join(" 👏 "));
        }
        break;

      case 'xkcd':
        if (isNaN(args[0]) && typeof args[0] !== 'undefined') {
          message.reply(`Usage: ${config.prefix}xkcd <id>\nExample: ${config.prefix}xkcd 292\nWhen no ID is provided, the most recent one will be displayed.`);
        } else {
          const xkcdurl = typeof args[0] === 'undefined' ? '' : '/' + encodeURIComponent(args[0]);
          request.get('https://xkcd.com' + xkcdurl + '/info.0.json', function(error, response, body) {
            if (!error && response.statusCode == 200) {
              var xkcd = JSON.parse(body);
              var xkcde = new Discord.MessageEmbed()
                .setColor(Math.floor(Math.random() * 16777215))
                .setTitle(xkcd.num + ': ' + xkcd.safe_title)
                .setDescription('Alt text: ' +  xkcd.alt)
                .setImage(xkcd.img)
                .setURL('https://xkcd.com/' + xkcd.num)
                .setTimestamp(new Date(xkcd.year, xkcd.month, xkcd.day))
                .setFooter('xkcd', 'https://i.imgur.com/kvScABp.png');
              sendEmbed(message.channel, xkcde);
            } else {
              message.reply('An error occured while accessing the xkcd API!');
            }
          });
        }
        break;

      case 'emote':
        if (!args[0]) {
          message.reply(`Usage: ${config.prefix}emote <name>\nExample: ${config.prefix}emote turtle`);
        } else {
          const emote = message.guild.emojis.cache.find(emoji => emoji.name === args[0]);
          if (typeof emote === 'undefined') {
            message.reply("Error: Emote not found!");
          } else {
            message.channel.send(emote.toString());
          }
        }
        break;

      case 's':
        var match = /s (.+)\/(.*)/.exec(message.content.substr(1));
        if (match === null) {
          message.reply(`Usage: ${config.prefix}s <find>/<replace>\nExample: ${config.prefix}s tst/test`);
        } else {
          message.channel.messages.fetch({ limit: 2 }).then(messages => {
            const m = messages.last();
            message.reply(m.content.replace(match[1], match[2]));
          });
        }
        break;

      case 'help':
        message.reply('Sent you a DM!');
        var help = new Discord.MessageEmbed()
          .setColor(Math.floor(Math.random() * 16777215))
          .setTitle('Help for MagicalHourglass:')
          .setDescription('Invite this bot to your server: https://discordapp.com/oauth2/authorize?client_id=305631536852631552&scope=bot&permissions=1144384577\nCommands:')
          .setThumbnail('https://himbeer.me/images/logo-monochrome.png')
          .addField(`${config.prefix}randomsofe`, 'Generate a random SOFe avatar')
          .addField(`${config.prefix}makesofe`, `Usage: ${config.prefix}makesofe <hexcode> <hexcode for background> [rotation in degrees]\nExample: ${config.prefix}makesofe FFEE00 FFFFFF 90`)
          .addField(`${config.prefix}say`, `Let me say something for you...\nExample: ${config.prefix}say Hi`)
          .addField(`${config.prefix}8ball`, `Uses 8ball.delegator.com  to ask the magic 8-Ball for a question\nExample: ${config.prefix}8ball Am I great?`)
          .addField(`${config.prefix}weather`, `Get the current weather of a specific cifm OpenWeatherMap\nUsage: ${config.prefix}weather <city>\nExample: ${config.prefix}weather London`)
          .addField(`${config.prefix}cat`, 'Get a random cat image from random.cat')
          .addField(`${config.prefix}fish`, 'Go fishing!')
          .addField(`${config.prefix}whoami`, 'Get information about yourself.')
          .addField(`${config.prefix}whois`, `Get information about another member.\nUsage: ${config.prefix}whois @mentionOfaUser\nExample: ${config.prefix}whois @HimbeersaftLP#8553`)
          .addField(`${config.prefix}googlepic`, `Search Google for images.\nUsage: ${config.prefix}googlepic <search term>\nExample: ${config.prefix}googlepic boxofdevs team`)
          .addField(`${config.prefix}poggit`, `Search for a plugin release on Poggit.\nUsage: ${config.prefix}poggit <plugin name>\nExample: ${config.prefix}poggit DevTools`)
          .addField(`${config.prefix}channels`, `Shows a list of channels of the provided type.\nUsage: ${config.prefix}channel <text|voice>`)
          .addField(`${config.prefix}chuck`, `Get a random Chuck Norris fact from api.chucknorris.io.`)
          .addField(`${config.prefix}ai`, 'Let the AI execute commands, just try it!')
          .addField(`${config.prefix}issue or ${config.prefix}pr`, `Find an issue/pull request on GitHub.\nUsage: ${config.prefix}issue <repo> <number> (on PMMP Discord also ${config.prefix}issue <number> for the PMMP repo)\nExample: ${config.prefix}issue boxofdevs/commandshop 2`)
          .addField(`${config.prefix}poll`, `Make a poll using reactions!\nUsage: ${config.prefix}poll <title|choice1|choice2|choice3|...> [optional: time in seconds]\nExample: What do you prefer?|Potatoes|Trains|Turtles|Juice boxes`)
          .addField(`${config.prefix}info or ${config.prefix}status`, 'Display information and stats about this bot.')
          .addField(`${config.prefix}convert`, `Convert currencies (supports cryptocurrencys)\nUsage: ${config.prefix}convert <amount> <from> <to>\nExample: ${config.prefix}convert 2 btc usd`)
          .addField(`${config.prefix}mock`, `maKeS tHE TeXt loOK lIkE tHiS\nUsage: ${config.prefix}mock <text>\nExample: ${config.prefix}mock How can I make an Email address`)
          .addField(`${config.prefix}clap`, `Add 👏 some 👏 applause 👏 to 👏 your 👏 message.\nUsage: ${config.prefix}clap <text>\nExample: ${config.prefix}clap That is great`)
          .addField(`${config.prefix}xkcd`, `Gets the given or most recent comic from xkcd.com.\nUsage: ${config.prefix}xkcd <id>\nExample: ${config.prefix}xkcd 292\nWhen no ID is provided, the most recent one will be displayed.`)
          .addField(`${config.prefix}emote`, `Send an emote of the server you\'re on (useful for sending animated emotes without having Discord Nitro)\nUsage: ${config.prefix}emote <name>\nExample: ${config.prefix}emote turtle`)
          .addField(`${config.prefix}s`, `Find and replace text in the last message of the channel your\'re in.\nUsage: ${config.prefix}s <find>/<replace>\nExample: ${config.prefix}s tst/test`);
        message.author.send("", {
          embed: help
        });
        break;
      default:
        if (message.guild.id == config.mainguild) {
          commandsuccess = false;
        }
        break;
    }
    if(commandsuccess && message.guild.id == config.mainguild) message.react(juice);
    fish = ['🐠', '🐟', '🐡', '🐬', '🐳', '🐋'];

  } else if (githubregex.test(message.content)) {
    var match = githubregex.exec(message.content);
    gitLinePreview(match, message);
  }
});

if (firstrun == 1) {
  client.login(config.discordtoken)
    .then(function() {
      console.log("Login successful!");
    })
    .catch(function(r) {
      console.error("Login not successful! " + r);
    });
  firstrun = 0;
} else {
  console.log("Not logging in again for preventing bot token reset!");
}

function sendEmbed(channel, embed) {
  channel.send({
    embed: embed
  });
}

function sendLong(text, max = 2000, limintext = max) {
  if (text.length > max) {
    return 'Message is too long to send (' + text.length + ' of ' + limintext + ' chars)';
  } else {
    return text;
  }
}

function reactionPoll(choices, message) {
  return new Promise(function(resolve, reject) {
    const reactions = config.reaction_alphabet.slice(0, choices);
    const messageReactions = [];
    reactions.forEach(function(rt, ind) {
      if (ind == 0) {
        fr = message.react(rt);
      } else if (ind === choices - 1) {
        fr.then((messageReaction) => {
          messageReactions.push(messageReaction);
          return message.react(rt);
        }).catch((err) =>
          reject(err)
        ).then((messageReaction) => {
          messageReactions.push(messageReaction);
          resolve({reactions, messageReactions});
        });
      } else {
        fr = fr.then((messageReaction) => {
          messageReactions.push(messageReaction);
          return message.react(rt);
        }).catch((err) =>
          reject(err)
        );
      }
    });
  });
}

function gsessionid(message, type = "full") {
  var date = new Date();
  if (type == "full") {
    return message.author.id + '-' + message.channel.id + '-' + date.getUTCFullYear() + '-' + date.getUTCMonth() + '-' + date.getUTCDate();
  } else if (type == "member") {
    return message.author.id + '-' + date.getUTCFullYear() + '-' + date.getUTCMonth() + '-' + date.getUTCDate();
  }
}

function getweather(q, message) {
  request.get('http://api.openweathermap.org/data/2.5/weather?APPID=' + config.owmid + '&units=metric&q=' + q, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var w = JSON.parse(body);
      var fahrenheit = (w.main.temp * 9 / 5 + 32).toFixed(2);
      var mph = (w.wind.speed * 2.23693629205).toFixed(1);
      var wth = new Discord.MessageEmbed()
        .setColor(Math.floor(Math.random() * 16777215))
        .setTitle('Weather for ' + w.name + ', ' + w.sys.country + ':')
        .setDescription(w.weather[0].main)
        .setThumbnail('http://openweathermap.org/img/w/' + w.weather[0].icon + ".png")
        .addField('Weather description', w.weather[0].description)
        .addField('Temperature', w.main.temp + ' °C / ' + fahrenheit + ' °F')
        .addField('Wind speed', w.wind.speed + ' meter/sec / ' + mph + ' mph')
        .addField('Pressure', w.main.pressure + ' hPa')
        .addField('Humidity', w.main.humidity + ' %')
        .addField('Cloudiness', w.clouds.all + ' %')
        .setFooter('Data from OpenWeatherMap', 'https://upload.wikimedia.org/wikipedia/commons/1/15/OpenWeatherMap_logo.png')
      sendEmbed(message.channel, wth);
    } else {
      message.reply('City not found or an error occured while accessing the OpenWatherMap API!');
    }
  });
}

function getcat(message) {
  request.get('http://aws.random.cat/meow', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var c = JSON.parse(body);
      var cat = new Discord.MessageEmbed()
        .setColor(Math.floor(Math.random() * 16777215))
        .setTitle("Here's your random cat:")
        .setDescription('Link: [Click Here](' + c.file + ')')
        .setImage(c.file)
        .setFooter('Randomly generated cat link by random.cat');
      sendEmbed(message.channel, cat);
    } else {
      message.reply('An error occured while accessing the random.cat API!');
    }
  });
}

function googlepic(q, message, r = 1) {
  request.get('https://www.googleapis.com/customsearch/v1?q=' + encodeURIComponent(q) + '&cx=' + config.google_cse_id + '&searchType=image&fields=items(image%2FcontextLink%2Clink%2Ctitle)%2CsearchInformation&safe=medium&key=' + config.googlekey, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var g = JSON.parse(body);
      var ri = Math.floor(Number(r));
      if (ri <= 0 || ri > g.items.length) {
        ri = 0;
        message.reply('This result index is invalid!');
      } else {
        ri = ri - 1;
      }
      var gres = new Discord.MessageEmbed()
        .setColor(Math.floor(Math.random() * 16777215))
        .setTitle('#' + (ri + 1).toString() + ' Result: ' + g.items[ri].title)
        .setDescription('Image URL: ' + g.items[ri].link + '\nImage from: ' + g.items[ri].image.contextLink + '\n\nResult ' + (ri + 1).toString() + ' of ' + g.items.length.toString() + ' loaded results.\n,googlepic <search term> -r <number> to see the other results.')
        .setImage(g.items[ri].link);
      message.reply(g.searchInformation.formattedTotalResults + ' results in ' + g.searchInformation.formattedSearchTime + ' seconds:', {
        embed: gres
      });
    } else {
      message.reply('An error occured while accessing the Google Custom Search API!');
    }
  });
}

function searchpoggit(plugin, message) {
  request.get('https://poggit.pmmp.io/releases.json?name=' + plugin, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      if (body == '[]') {
        message.reply('Error: Plugin not found!');
      } else {
        var pl = JSON.parse(body)[0];
        var uemb = new extras.UnrealEmbed()
          .setDescription(pl.tagline)
          .addField('Version', pl.version)
          .addField('Downloads', pl.downloads)
          .addField('Build', pl.build_number)
          .addField('Github', 'https://github.com/' + pl.repo_name)
          .addField('Download', pl.artifact_url + '/' + pl.name + '.phar');
        if (pl.api.length > 0) uemb.addField('For APIs', pl.api[0].from + ' - ' + pl.api[0].to);
        uemb.addField('License', pl.license);
        var pinfo = new Discord.MessageEmbed()
          .setColor(Math.floor(Math.random() * 16777215))
          .setTitle(pl.name + ' (' + pl.state_name + '):')
          .setDescription(uemb.toString())
          .setThumbnail(pl.icon_url)
          .setTimestamp(new Date(pl.submission_date * 1000))
          .setURL(pl.html_url)
          .setFooter('Data from poggit.pmmp.io', 'https://avatars7.githubusercontent.com/u/22367352?v=4&s=50');
        sendEmbed(message.channel, pinfo);
      }
    } else {
      message.reply('An error occured while accessing the Poggit API!');
    }
  });
}

function getchuck(message) {
  request.get('https://api.chucknorris.io/jokes/random', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var cn = JSON.parse(body);
      var cj = new Discord.MessageEmbed()
        .setColor(Math.floor(Math.random() * 16777215))
        .setTitle('Your Chuck Norris fact, fresh from chucknorris.io:')
        .setDescription(cn.value)
        .setThumbnail(cn.icon_url)
        .setURL(cn.url)
        .setFooter('Fact from api.chucknorris.io', 'https://assets.chucknorris.host/img/chucknorris_logo_coloured_small@2x.png');
      sendEmbed(message.channel, cj);
    } else {
      message.reply("You can't access the Chuck Norris API, the Chuck Norris API accesses you!");
    }
  });
}

function gitIssue(repo, number, message) {
  request.get({
    url: 'https://api.github.com/repos/' + repo + '/issues/' + encodeURIComponent(number),
    headers: {
      'User-Agent': 'MagicalHourglass',
      'Accept': 'application/vnd.github.squirrel-girl-preview'
    }
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var g = JSON.parse(body);
      var ilabels = "";
      g.labels.forEach(function(label, i) {
        ilabels += label.name + ((i !== g.labels.length - 1) ? ', ' : "");
      });
      var gissue = new Discord.MessageEmbed()
        .setColor(Math.floor(Math.random() * 16777215))
        .setTitle(((typeof g.pull_request == "undefined") ? 'Issue' : 'Pull request') + ' #' + number + ': ' + g.title)
        .addField('Information:', '__Created by__ ' + g.user.login + '\n__State:__ ' + g.state + '\n__Labels:__ ' + ((g.labels !== []) ? ilabels : 'none') + '\n__Comments:__ ' + g.comments + '\n__Locked:__ ' + g.locked + '\n__Reactions:__\n' + g.reactions['+1'] + ' 👍 | ' + g.reactions['-1'] + ' 👎 | ' + g.reactions.laugh + ' 😄 | ' + g.reactions.confused + ' 😕 | ' + g.reactions.heart + ' ❤️ | ' + g.reactions.hooray + ' 🎉')
        .setThumbnail(g.user.avatar_url)
        .setTimestamp(new Date(g.created_at))
        .setURL(g.html_url)
        .setFooter('Data from api.github.com', 'https://assets-cdn.github.com/images/modules/logos_page/Octocat.png');
      if (removeMd(g.body).length > 2045) {
        gissue.addField('Notice:', 'The Description has been shortened to fit into an embed');
        gissue.setDescription((removeMd(g.body).substring(0, 2045)) + '...');
      } else {
        gissue.setDescription(removeMd(g.body));
      }
      sendEmbed(message.channel, gissue);
    } else if (!error && response.statusCode == 404) {
      message.reply('Error: Repo or issue not found.');
    } else if (!error && response.statusCode == 410) {
      message.reply('Error: The requested issue was deleted.');
    } else {
      message.reply('An error occured while accessing the GitHub API!');
    }
  });
}

function currencyConvert(amount, from, to) {
  return new Promise(function(resolve) {
    request.get('https://api.cryptonator.com/api/ticker/' + encodeURIComponent(from) + '-' + encodeURIComponent(to), function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var con = JSON.parse(body);
        if (con.success === false) {
          resolve('Error: ' + con.error);
        } else {
          resolve(amount * con.ticker.price);
        }
      } else {
        resolve('An error occured while accessing the Cryptonator API!');
      }
    });
  });
}

function gitLinePreview(match, message) {
  /**
   * match:
   *        1: owner + repo
   *        2: branch
   *        3: path + file
   *        4: line-from
   *        5: line-to
   */
  request(
      {
        url: 'https://api.github.com/repos/' + match[1] + 'contents/' + match[3] + '?ref=' + match[2],
        headers: {
          'User-Agent': config.github_username,
          'Accept': 'application/vnd.github.v3.raw',
          'Authorization': 'token ' + config.github_token
        }
      },
      function(error, response, body) {
        if (!error && response.statusCode == 200) {
          var lines = body.split('\n');
          if (typeof lines[match[4] - 1] === 'undefined') return;
          match[4] = Number(match[4]);
          if (typeof match[5] === "undefined") {
            match[5] = match[4];
            var from = match[4] - 5;
            var to = match[4] + 5;
          } else {
            match[5] = Number(match[5]);
            if (typeof lines[match[5] - 1] === 'undefined' || match[4] >= match[5]) return;
            var from = match[4];
            var to = match[5];
            var diff = match[5] - match[4];
            if (diff < 11) {
              var space = Math.round((11 - diff) / 2);
              from = match[4] - space;
              to = match[5] + space;
            }
            if (diff > 40) {
              from = match[4];
              to = match[4] + 40;
            }
          }
          var lang = fileendregex.exec(match[3]) ? fileendregex.exec(match[3])[1] : '';
          if (lang === "kt") lang = "kotlin"; // Workaround for Kotlin syntax highlighting
          if (lang === "svg") lang = "xml"; // Workaround for svg syntax highlighting
          var cleanFileName = match[3].replace(/\?.+/, ""); // Remove HTTP GET Query Parameters
          var codemsg = `Showing lines ${from} - ${to} of \`${cleanFileName}\`\n` + '```' + lang + '\n';
          for (i = from; i <= to; i++) {
            if (typeof lines[i - 1] !== 'undefined') {
              codemsg += `${((i >= match[4] && i <= match[5]) ? ">" : " ")}${(extras.nlength(i) < extras.nlength(to) ? " " : "")}${i} ${lines[i - 1]}\n`;
            }
          }
          message.reply(codemsg + '```');
        }
      }
  )
}

function whois(member, mtn = true) {
  var m = member.user;
  var rls = member.roles.cache.map((r) => r.name).join(', ');
  var uemb = new extras.UnrealEmbed()
    .addField('Username', m.username)
    .addField('ID', m.id)
    .addField('Discord Tag', m.tag)
    .addField('Avatar URL', m.displayAvatarURL())
    .addField('Created at', m.createdAt)
    .addField('Joined server at', member.joinedAt)
    .addField('Bot?', m.bot)
    .addField('Roles', rls);
  return extras.embed('Information about the user ' + m.username + ':', uemb.toString(), m.displayAvatarURL());
}

function getrandrot() {
  $rand = Math.floor((Math.random() * 4) + 1);
  if ($rand == 1) {
    return 0;
  } else if ($rand == 2) {
    return 90;
  } else if ($rand == 3) {
    return 180;
  } else if ($rand == 4) {
    return 270;
  }
}

function makesofe(message, hex, bghex, rot = 0) {
  var sofe = 'https://himbeer.me/sofeavatars/sofeavatar.php?hex=' + hex + '&bghex=' + bghex + '&rot=' + rot;
  var sofembed = new Discord.MessageEmbed()
    .setColor(parseInt(hex, 16))
    .setTitle('Your SOFe avatar has been generated!')
    .setDescription('Link: ' + sofe)
    .setThumbnail(sofe);
  sendEmbed(message.channel, sofembed);
}
