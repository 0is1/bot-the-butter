const fetch = require('isomorphic-fetch');
const Promise = require('bluebird');
const _ = require('lodash');

const WELCOME_TEXT_QUICK_REPLY = "Choose a category right away and I'll make sure you get nice image!";

const TEXT_CATEGORIES = {
    CAT_IMAGE: [
        "It's so cute!",
        "Meow!",
        "😻😻😻",
    ],
    FOOD_IMAGE: [
        "This one is really worth a watch",
        "You live only once.. don't mess it up",
        "What are your goals?",
    ],
    CITY_IMAGE: [
        "What a cool looking city!",
        "I sure would live there!",
    ],
};

const pickCategory = {
    quick_replies: [
        {
            content_type: 'text',
            title: '😻 Cat image? 😻',
            payload: 'GET_RANDOM_CAT_IMAGE'
        }, {
            content_type: 'text',
            title: '😋 Fooooood image? 😋',
            payload: 'GET_RANDOM_FOOD_IMAGE'
        }, {
            content_type: 'text',
            title: '🕋 City image? 🕋',
            payload: 'GET_RANDOM_CITY_IMAGE'
        }
    ],
    typing: true
};

module.exports = function(bp) {
    bp.middlewares.load();
    bp.hear(/(what i should do|help)/i, (event, next) =>{
        console.log(event.user);
        bp.messenger.sendText(event.user.id, WELCOME_TEXT_QUICK_REPLY, pickCategory);
    });
    bp.hear({
        type: 'postback',
        text: 'GET_STARTED'
    }, (event, next) => {
        const {first_name, last_name} = event.user;
        bp.logger.info('New user:', first_name, last_name);

        const WELCOME_SENTENCES = [
            "Hey, so I've heard that you like cat images? 😻",
            "In exchange I only ask from you that you don't talk to me like I was human.. I'm clearly not! 🤖",
            "👉 Let's just stick to using buttons, that's going to be easier for the both of us",
        ];

        Promise.mapSeries(WELCOME_SENTENCES, txt => {
            bp.messenger.sendText(event.user.id, txt, {typing: true});
            return Promise.delay(2000);
        })
        .then(() => {
            bp.messenger.sendText(event.user.id, WELCOME_TEXT_QUICK_REPLY, pickCategory);
        });
    });
    bp.hear(/random cat image/i, (event, next) => {
        const random = Math.floor(Math.random() * 10) + 1;
        const url = `http://lorempixel.com/400/200/cats/${random}/`;
        setTimeout(() => bp.messenger.sendAttachment(event.user.id, 'image', url), 1000);
    });

    bp.hear(/commands/i, (event, next) => { // We use a regex instead of a hardcoded string
        // const first_name = event.user.first_name
        // bp.messenger.sendText(event.user.id, 'Hello, ' + first_name, {typing: true})
        fetch('http://localhost:3000/api/botpress-rivescript/scripts').then((response) => {
            if (response.status === 200) {
                return response.json();
            } else {
                throw {message: 'Sorry, something isn\'t working as expected :('};
            }
        }).then((json) => {
            let usedCommands = {};
            Object.keys(json).map(function(objectKey, index) {
                let value = json[objectKey];
                const regex = /\+ ([a-z ()|]{1,})/g;
                let m;
                try {
                    while ((m = regex.exec(value)) !== null) {
                        // This is necessary to avoid infinite loops with zero-width matches
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }

                        // The result can be accessed through the `m`-variable.
                        m.forEach((match, groupIndex) => {
                            if (1 === groupIndex) {
                                const cleanMatch = match.replace(/( \($|^\(|\)$)/g, '').trim();
                                if ('' != cleanMatch && !usedCommands[cleanMatch]) {
                                    usedCommands[cleanMatch] = true;
                                    // TODO: do not flood text
                                    // bp.messenger.sendText(event.user.id, `"${cleanMatch}"`);
                                }
                            }
                        });
                    }
                } catch (err) {
                    console.error(err);
                    throw {message: 'Sorry, something isn\'t working as expected :('};
                }
            });
        }).catch((err) => {
            bp.messenger.sendText(err.message, {typing: true});
        });
    });
    const hearGetImage = category => {
        bp.hear({
            text: 'GET_RANDOM_' + category
        }, (event, next) => {
            const text = _.sample(TEXT_CATEGORIES[category])
            bp.messenger.sendText(event.user.id, text);
            bp.sendRandomImage(event.user.id, category);
        })
    };

    bp.sendRandomImage = (userId, category) => {
        let type = 'cats';
        switch (category) {
            case 'CAT_IMAGE':
                type = 'cats';
                break;
            case 'FOOD_IMAGE':
                type = 'food';
                break;
            case 'CITY_IMAGE':
                type = 'city';
                break;
            default:
                type = 'sports';
        }
        const random = Math.floor(Math.random() * 10) + 1;
        const url = `http://lorempixel.com/400/200/${type}/${random}/`;
        bp.messenger.sendAttachment(userId, 'image', url);
    };

    // Create a listener for each categories
    _.keys(TEXT_CATEGORIES).forEach(hearGetImage);

}
