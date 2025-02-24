// 3rd party.
import { trace, type Tracer } from '@opentelemetry/api';
// Internal.
import { serviceConfig } from '@/config';
import { Logger } from '@/lib/logger';
import {
    telegram,
    formatServiceState,
} from '@/lib/notifications';

export enum ServiceState {
    start = 'start',
    stop = 'stop'
}

export abstract class Service {
    protected notificationsQueue: string[];

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
        { queue } = { queue: false },
    ): Promise<void> {
        if (queue) {
            this.notificationsQueue.push(message);
        } else {
            await telegram.sendNotification(message);
        }
    }

    protected async flushAllNotification(): Promise<void> {
        await Promise.all(
            this.notificationsQueue.map(telegram.sendNotification.bind(telegram)),
        );
        this.notificationsQueue = [];
    }
}

export interface ServiceClass {
    new(): Service;
}
