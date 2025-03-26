// 3rd party.
import { Telegraf } from 'telegraf';
// Internal
import { telegramConfig } from '@/config';
import { safe } from '@/lib/decorators';
import { Logger } from '@/lib/logger';

interface ActionButton {
    text: string;
    command: string;
    param?: string;
}

export type ActionKeyboard = ActionButton[][];

export interface ActionResult {
    res: string;
    keyboard?: ActionKeyboard;
    delete?: boolean;
}

class Telegram {
    private bot: Telegraf;

    /**
     * @note Implicityly used by the "safe" decorator.
     */
    private logger: Logger;

    constructor() {
        this.bot = new Telegraf(telegramConfig.BOT_TOKEN);
        this.logger = new Logger(this.constructor.name);
    }

    @safe({ silent: false })
    public async send(
        messgae: string,
        keyboard: ActionKeyboard = null,
    ): Promise<void> {
        await this._send(
            telegramConfig.NOTIFICATIONS_CHAT_ID,
            messgae,
            keyboard,
        );
    }

    private async _send(
        chatId: string,
        message: string,
        keyboard: ActionKeyboard = null,
    ): Promise<void> {
        await this.bot.telegram.sendMessage(
            chatId,
            message,
            {
                parse_mode: 'HTML',
                link_preview_options: {
                    is_disabled: false,
                },
                ...(keyboard && {
                    reply_markup: {
                        inline_keyboard: keyboard.map(
                            (buttons: ActionButton[]) => buttons.map(
                                ({ text, command, param }) => ({
                                    text,
                                    callback_data: this.buildCommandData(command, param),
                                }),
                            ),
                        ),
                    },
                }),
            },
        );
    }

    public on(
        command: string,
        callback: (arg: string) => Promise<ActionResult>,
    ): this {
        this.bot.action(new RegExp(`^${command}_(.*)$`), async (ctx) => {
            try {
                const arg = ctx.match[1];
                await ctx.answerCbQuery('Processing...');
                const { res, keyboard, delete: deleteMessage } = await callback(arg);
                if (deleteMessage) {
                    await ctx.deleteMessage();
                }
                if (!res) {
                    return;
                }
                await ctx.reply(res, {
                    parse_mode: 'HTML',
                    link_preview_options: {
                        is_disabled: false,
                    },
                    ...(keyboard && {
                        reply_markup: {
                            inline_keyboard: keyboard.map(
                                (buttons: ActionButton[]) => buttons.map(
                                    ({ text, param, command: nextCommand }) => ({
                                        text,
                                        callback_data: this.buildCommandData(nextCommand, param),
                                    }),
                                ),
                            ),
                        },
                    }),
                });
            } catch (err) {
                try {
                    await ctx.deleteMessage();
                    await ctx.reply(err.toString());
                } catch {
                    /** empty */
                } finally {
                    this.logger.error(err);
                }
            }
        });
        return this;
    }

    public async launch(): Promise<void> {
        // Note that if we add "await" it will block program execution.
        this.bot.launch();
    }

    public stop(reason?: string): void {
        this.bot.stop(reason);
    }

    // eslint-disable-next-line class-methods-use-this
    public buildCommandData(command: string, param: string): string {
        return `${command}_${param}`;
    }
}

export const telegram = new Telegram();
