// Internal.
import { validateConfig, serviceConfig } from '@/config';
import { Logger } from '@/lib/logger';
import { Service } from '@/services/service';

class Launcher {
    private isTerminated: boolean;

    private logger: Logger;

    private _service: Service;

    constructor() {
        this.isTerminated = false;
        this.logger = new Logger(this.constructor.name);
    }

    private get service(): Service {
        if (this._service !== undefined) {
            return this._service;
        }
        // Create service instance.
        // TODO: this._service = new SomeService();
        return this._service;
    }

    public async launch(): Promise<void> {
        // Config stage.
        try {
            validateConfig();
            this.setHooks();
            if (!this.service) {
                this.logger.warn('No service to start');
                return;
            }
            await this.service.setup();
        } catch (err) {
            this.logger.error(err);
            return;
        }
        // Start up stage.
        try {
            await this.service.start();
        } catch (err) {
            this.logger.error(err);
            await this.terminate();
        }
    }

    public async terminate(): Promise<void> {
        if (this.isTerminated) {
            return;
        }
        this.isTerminated = true;
        await this.service.teardown();
    }

    // eslint-disable-next-line class-methods-use-this
    private setHooks(): void {}
}

async function main() {
    const launcher = new Launcher();
    process.on('SIGTERM', async () => {
        try {
            await launcher.terminate();
        } finally {
            process.exit(0);
        }
    });
    await launcher.launch();
}

main();
