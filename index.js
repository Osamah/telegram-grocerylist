const { Scenes, session, Telegraf, Markup } = require('telegraf');
const { enter, leave } = Scenes.Stage;

const fs = require("fs");

const {
    TELEGRAM_BOT_TOKEN,
    ALLOWED_USER_IDS
} = process.env;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

let lists = [
    {
        name: 'Colruyt',
        items: ['Pizza', 'Shrimp', 'Cereal', 'Eggs', 'Yoghurt']
    },
    {
        name: 'Albert Heijn',
        items: ['Scrocchi', 'Twirly fries', 'Milka Bubbly', 'Bladerdeeg']
    }
];
try {
    const data = fs.readFileSync('data.json');
    lists = JSON.parse(data);
} catch (error) {
    console.log(error.message);
}

function start(ctx) {

    ctx.replyWithMarkdownV2(
        `Welcome to *The Grocery List*`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback('📝 New list', 'newlist'),
                Markup.button.callback('🗑 Remove list', 'removelist'),
                Markup.button.callback('👓 View lists', 'viewlists'),
            ],
            [
                Markup.button.callback('📃 Manage items', 'manageitems')
            ],
            [
                Markup.button.callback('☑️ Need', 'need'),
                Markup.button.callback('🛒 Shop', 'shop')
            ]
        ])
    );
};

bot.start(start);
bot.help(start);

// Add new grocery list scene
const newListScene = new Scenes.BaseScene('newlist');
newListScene.enter(async ctx => {
    const msg = await ctx.reply('Creating new list, what\'s the name?');
    ctx.scene.state.message_id = msg.message_id;
});
newListScene.command('cancel', leave());
newListScene.on('message', async ctx => {
    ctx.deleteMessage();
    ctx.deleteMessage(ctx.scene.state.message_id);

    lists.push({
        name: ctx.message.text,
        items: []
    });
    const msg = await ctx.replyWithMarkdownV2(`Created list *${ctx.message.text}*`);
    
    await new Promise(r => setTimeout(r, 2500));
    ctx.deleteMessage(msg.message_id);

    ctx.scene.leave('newlist');
});
newListScene.leave(ctx => storeData());

// Remove grocery list scene
const removeListScene = new Scenes.BaseScene('removelist');
removeListScene.enter(ctx => {
    if (lists.length) {
        ctx.reply(
            'What list do you want to remove?',
            Markup.inlineKeyboard(lists.map(list => [Markup.button.callback(list.name, `remove_${list.name}`)])),
        )
    } else {
        ctx.scene.leave('removeitems');
        ctx.replyWithMarkdownV2(`You don't have any lists`);
    }
});
removeListScene.command('cancel', leave());
removeListScene.action(/remove_.+/, async ctx => {
    ctx.deleteMessage();
    const action = ctx.update.callback_query.data;
    const selectedList = action.split('remove_')[1];

    lists = lists.filter(list => list.name !== selectedList);
    
    const msg = await ctx.replyWithMarkdownV2(`Removed list *${selectedList}*`);
    
    await new Promise(r => setTimeout(r, 2500));
    ctx.deleteMessage(msg.message_id);
    
    ctx.scene.leave('removelist');
});
removeListScene.leave(ctx => storeData());

// View new grocery lists scene
const viewListsScene = new Scenes.BaseScene('viewlists');
viewListsScene.enter(async (ctx) => {
    const msg = await ctx.replyWithMarkdownV2(
        lists.length ? lists.map(list => `*${list.name}* _\\(${list.items?.length || 0} items\\)_\n${list.items.map(i => `${i.needed ? '\\-' : ' '} ${i.name.replaceAll('(', '\\(').replaceAll(')', '\\)')}`).join('\n')}\n`).join('\n') : `_You don't have any lists_`,
        Markup.inlineKeyboard([Markup.button.callback('Done', 'done')])
    );
    ctx.scene.state.message_id = msg.message_id;
    // ctx.scene.leave('viewlists');
});
viewListsScene.action('done', ctx => {
    ctx.deleteMessage(ctx.scene.state.message_id);
    leave();
});
removeListScene.leave(ctx => {
    storeData()
});

// Add items to grocery list scene
const manageItemsInListScene = new Scenes.BaseScene('manageitems');
manageItemsInListScene.enter(async ctx => {
    if (lists.length) {
        const msg = await ctx.reply(
            'What list do you want to edit?',
            Markup.inlineKeyboard(lists.map(list => [Markup.button.callback(list.name, `list_${list.name}`)])),
        );
        ctx.scene.state.message_id = msg.message_id;
    } else {
        ctx.scene.leave('manageitems');
        ctx.replyWithMarkdownV2(`You don't have any lists`);
    }
});
manageItemsInListScene.on('message', ctx => {
    if (ctx.scene.state.list) {
        ctx.deleteMessage(ctx.message.message_id);
        lists.filter(list => list.name == ctx.scene.state.list)[0]?.items?.push({
            name: ctx.message.text,
            needed: true
        });
        ctx.telegram.editMessageText(
            ctx.message.chat.id,
            ctx.scene.state.message_id,
            undefined,
            `Editing list *${ctx.scene.state.list}*\n\nSelect a product to remove or send a message to add a new product\n\nPress _Done_ when completed`,
            {
                parse_mode: 'MarkdownV2',
                reply_markup:{
                    inline_keyboard: [
                        ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.map(item => [Markup.button.callback(item.name, `remove_${item.name}`)]),
                        [Markup.button.callback('Done', 'done')]
                    ]
                }
            }
        );
    }
});
manageItemsInListScene.action(/list_.+/, async ctx => {
    const action = ctx.update.callback_query.data;
    const selectedList = action.split('list_')[1];

    ctx.scene.state.list = selectedList;
    ctx.scene.state.items = [];

    ctx.deleteMessage();

    const msg = await ctx.replyWithMarkdownV2(
        `Editing list *${ctx.scene.state.list}*\n\nSelect a product to remove or send a message to add a new product\n\nPress _Done_ when completed`,
        Markup.inlineKeyboard([
            ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.map(item => [Markup.button.callback(item.name, `remove_${item.name}`)]),
            [Markup.button.callback('Done', 'done')]
        ]),
    );
    ctx.scene.state.message_id = msg.message_id;
});
manageItemsInListScene.action(/remove_.+/, ctx => {
    const action = ctx.update.callback_query.data;
    const selectedItem = action.split('remove_')[1];

    const list = lists.filter(list => list.name == ctx.scene.state.list)[0];
    list.items = list.items.filter(i => i.name !== selectedItem);

    ctx.editMessageText(
        `Editing list *${ctx.scene.state.list}*\n\nSelect a product to remove or send a message to add a new product\n\nPress _Done_ when completed`,
        {
            parse_mode: 'MarkdownV2',
            reply_markup:{
                inline_keyboard: [
                    ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.map(item => [Markup.button.callback(item.name, `remove_${item.name}`)]),
                    [Markup.button.callback('Done', 'done')]
                ]
            }
        }
    );
});
manageItemsInListScene.action('done', leave());
manageItemsInListScene.command('cancel', leave());
manageItemsInListScene.leave(async ctx => {
    ctx.deleteMessage(ctx.scene.state.message_id);
    if (ctx.scene.state.list) {
        const msg = await ctx.replyWithMarkdownV2(`Done editing list *${ctx.scene.state.list}*\\.\nThis grocery list now contains *${lists.filter(list => list.name == ctx.scene.state.list)[0]?.items?.length}* items`);

        await new Promise(r => setTimeout(r, 2500));
        ctx.deleteMessage(msg.message_id);
    }
});

// Need scene
const needScene = new Scenes.BaseScene('need');
needScene.enter(async ctx => {
    if (lists.length) {
        const msg = await ctx.reply(
            'What list do you need items from?',
            Markup.inlineKeyboard(lists.map(list => [Markup.button.callback(`${list.name}`, `list_${list.name}`)]))
        );
        ctx.scene.state.message_id = msg.message_id;
    } else {
        ctx.scene.leave('need');
        ctx.replyWithMarkdownV2(`You don't have any lists`);
    }
});
needScene.leave(async ctx => {
    if (ctx.scene.state.list) {
        ctx.editMessageText(
            `Done with *${ctx.scene.state.list}*!`,
            {
                parse_mode: 'Markdown'
            },
            ctx.scene.state.message_id
        );

        await new Promise(r => setTimeout(r, 2500));
        ctx.deleteMessage();
    }
    storeData();
});
needScene.command('cancel', leave());
needScene.action(/list_.+/, async ctx => {
    const action = ctx.update.callback_query.data;
    const selectedList = action.split('list_')[1];

    ctx.scene.state.list = selectedList;
    ctx.scene.state.items = lists.filter(list => list.name === ctx.scene.state.list)[0].items.filter(item => item.needed).map(item => item.name);

    const msg = await ctx.editMessageText(
        `Select the items you need from list '${ctx.scene.state.list}':`,
        Markup.inlineKeyboard([
            ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.map(item => {
                let text = `☑️ ${item.name}`;
                let data = `select_${item.name}`;

                if (ctx.scene.state.items.includes(item.name)) {
                    text = `✅ ${item.name}`;
                    data = `unselect_${item.name}`;
                }
                return [Markup.button.callback(text, data)]
            }),
            [Markup.button.callback('Done', 'done')]
        ]),
        ctx.scene.state.message_id
    );
    ctx.scene.state.message_id = msg.message_id;
});
needScene.action(/select_.+/, ctx => {
    const action = ctx.update.callback_query.data;
    const selected = !action.includes('unselect');
    const selectedItem = action.split('select_')[1];

    if (selected) {
        ctx.scene.state.items.push(selectedItem);
    } else {
        ctx.scene.state.items = ctx.scene.state.items.filter(item => item !== selectedItem)
    }

    return ctx.editMessageText(
        `Select the items you need from list '${ctx.scene.state.list}':`,
        Markup.inlineKeyboard([
            ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.map(item => {
                let text = `☑️ ${item.name}`;
                let data = `select_${item.name}`;

                if (ctx.scene.state.items.includes(item.name)) {
                    text = `✅ ${item.name}`;
                    data = `unselect_${item.name}`;
                }
                return [Markup.button.callback(text, data)]
            }),
            [Markup.button.callback('Done', 'done')]
        ]),
        ctx.scene.state.message_id
    );
});
needScene.action(/done/, async ctx => {
    lists.filter(list => list.name === ctx.scene.state.list)[0].items.map(item => {
        item.needed = ctx.scene.state.items.includes(item.name);
    });
    ctx.scene.leave();
});

// Shop scene
const shopScene = new Scenes.BaseScene('shop');
shopScene.enter(async ctx => {
    if (lists.length) {
        const msg = await ctx.reply(
            'What list do you want to shop from?',
            Markup.inlineKeyboard(lists.map(list => [Markup.button.callback(`${list.name}`, `list_${list.name}`)]))
        );
        ctx.scene.state.message_id = msg.message_id;
    } else {
        ctx.scene.leave('shop');
        ctx.replyWithMarkdownV2(`You don't have any lists`);
    }
});
shopScene.leave(async ctx => {
    if (ctx.scene.state.list) {
        ctx.editMessageText(
            `Done with *${ctx.scene.state.list}* shopping!`,
            {
                parse_mode: 'Markdown'
            },
            ctx.scene.state.message_id
        );

        await new Promise(r => setTimeout(r, 2500));
        ctx.deleteMessage();
    }
    storeData();
});
shopScene.command('done', leave());
shopScene.action(/list_.+/, async ctx => {
    const action = ctx.update.callback_query.data;
    const selectedList = action.split('list_')[1];

    ctx.scene.state.list = selectedList;
    ctx.scene.state.items = [];

    const msg = await ctx.editMessageText(
        `Shopping from list '${ctx.scene.state.list}'.`,
        Markup.inlineKeyboard(
            [
                ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.filter(item => item.needed).map(item => [Markup.button.callback(`☑️ ${item.name}`, `select_${item.name}`)]),
                [Markup.button.callback('Done', 'done')]
            ],
        ),
        ctx.scene.state.message_id
    );
    ctx.scene.state.message_id = msg.message_id;
});
shopScene.action(/select_.+/, ctx => {
    const action = ctx.update.callback_query.data;
    const selected = !action.includes('unselect');
    const selectedItem = action.split('select_')[1];

    if (selected) {
        ctx.scene.state.items.push(selectedItem);
    } else {
        ctx.scene.state.items = ctx.scene.state.items.filter(item => item !== selectedItem)
    }

    return ctx.editMessageText(
        `Shopping from list '${ctx.scene.state.list}'.`,
        Markup.inlineKeyboard([
            ...lists.filter(list => list.name === ctx.scene.state.list)[0].items.filter(item => item.needed).map(item => {
                let text = `☑️ ${item.name}`;
                let data = `select_${item.name}`;

                if (ctx.scene.state.items.includes(item.name)) {
                    text = `✅ ${item.name}`;
                    data = `unselect_${item.name}`;
                }
                return [Markup.button.callback(text, data)]
            }),
            [Markup.button.callback('Done', 'done')]
        ]),
        ctx.scene.state.message_id
    );
});
shopScene.action(/done/, async ctx => {
    ctx.scene.state.items.map((item => {
        lists.filter(list => list.name === ctx.scene.state.list)[0].items.filter(i => i.name == item)[0].needed = false;
    }))
    ctx.scene.leave();
});

function storeData() {
    const data = JSON.stringify(lists, null, 4);

    fs.writeFile('data.json', data, (error) => {
        if (error) {
            console.log(error.message);
        }

        console.log('data.json written correctly');
    });
}

const stage = new Scenes.Stage([
    newListScene,
    removeListScene,
    viewListsScene,
    manageItemsInListScene,
    needScene,
    shopScene
]);
bot.use((ctx, next) => {
    const allowedUsers = (ALLOWED_USER_IDS || '').split(',');

    if (allowedUsers.includes(ctx.message?.from?.id.toString()) || allowedUsers.includes(ctx.callbackQuery?.from?.id.toString())) {
        return next();
    }

    return ctx.replyWithMarkdownV2(
        `This is a premium service\\. Please buy a subscription here:`,
        Markup.inlineKeyboard([Markup.button.url("Buy subscription", "https://gprivate.com/64uga")])
    );
});
bot.use(session());
bot.use(stage.middleware());
bot.use((ctx, next) => {
    storeData();
    return next();
});
bot.command('newlist', ctx => ctx.scene.enter('newlist'));
bot.command('removelist', ctx => ctx.scene.enter('removelist'));
bot.command('viewlists', ctx => ctx.scene.enter('viewlists'));
bot.command('manageitems', ctx => ctx.scene.enter('manageitems'));
bot.command('need', ctx => ctx.scene.enter('need'));
bot.command('shop', ctx => ctx.scene.enter('shop'));

bot.action('newlist', ctx => ctx.scene.enter('newlist'));
bot.action('removelist', ctx => ctx.scene.enter('removelist'));
bot.action('viewlists', ctx => ctx.scene.enter('viewlists'));
bot.action('manageitems', ctx => ctx.scene.enter('manageitems'));
bot.action('need', ctx => ctx.scene.enter('need'));
bot.action('shop', ctx => ctx.scene.enter('shop'));

bot.command('delete', async (ctx) => {
    let i = 0;
    while (true) {
        try {
            await ctx.deleteMessage(ctx.message.message_id - i++);
        } catch (e) {
            break;
        }
    }
});

const initialize = async () => {
    console.log('Launching bot...');
    bot.launch();

    console.log('Bot launched, running and listening');
};

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = {
    initialize
};

initialize();