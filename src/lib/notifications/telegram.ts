// 3rd party.
import { Telegraf } from 'telegraf';
// Internal
import { telegramConfig } from '@/config';
import { safe } from '@/lib/decorators';
import { Logger } from '@/lib/logger';

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
    public async sendNotification(messgae: string): Promise<void> {
        await this.send(telegramConfig.NOTIFICATIONS_CHAT_ID, messgae);
    }

    private async send(chatId: string, message: string): Promise<void> {
        await this.bot.telegram.sendMessage(
            chatId,
            message,
            {
                parse_mode: 'HTML',
                link_preview_options: {
                    is_disabled: false,
                },
            },
        );
    }
}

export const telegram = new Telegram();
