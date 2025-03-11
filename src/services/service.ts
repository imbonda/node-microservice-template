// 3rd party.
import { trace, type Tracer } from '@opentelemetry/api';
// Internal.
import { serviceConfig } from '@/config';
import { safe } from '@/lib/decorators';
import { Logger } from '@/lib/logger';
import {
    type NotificationExtra,
    telegram,
    formatServiceState,
} from '@/lib/notifications';

export enum ServiceState {
    start = 'start',
    stop = 'stop'
}

export abstract class Service {
    protected notificationsQueue: {
        message: string;
        extra: NotificationExtra;
     }[];

    protected logger: Logger;

    protected tracer: Tracer;

    constructor() {
        this.notificationsQueue = [];
        this.logger = new Logger(this.constructor.name);
        this.tracer = trace.getTracer(this.constructor.name);
    }

    public async setup(): Promise<void> {
        this.logger.info('Service setup');
        await this.setupHooks();
        const message = formatServiceState(serviceConfig.NAME, ServiceState.start);
        await this.notify(message);
    }

    public async teardown(): Promise<void> {
        this.logger.info('Service teardown');
        await this.teardownHooks();
        const message = formatServiceState(serviceConfig.NAME, ServiceState.stop);
        await this.notify(message);
    }

    // eslint-disable-next-line class-methods-use-this
    setupHooks(): Promise<void> { return Promise.resolve(); }

    // eslint-disable-next-line class-methods-use-this
    teardownHooks(): Promise<void> { return Promise.resolve(); }

    abstract start(): Promise<void>;

    protected async notify(
        message: string,
        {
            extra,
            queue,
        }: {
            extra?: NotificationExtra;
            queue: boolean;
        } = {
            queue: false,
        },
    ): Promise<void> {
        if (queue) {
            this.notificationsQueue.push({ message, extra });
        } else {
            await telegram.send(message, extra);
        }
    }

    @safe({ silent: false })
    protected async flushAllNotification(): Promise<void> {
        await Promise.all(
            this.notificationsQueue.map(
                ({ message, extra }) => telegram.send(message, extra),
            ),
        );
        this.notificationsQueue = [];
    }
}

export interface ServiceClass {
    new(): Service;
}
