// 3rd party.
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
// Internal.
import { nodeEnv, opentelemetryConfig, serviceConfig } from '@/config';
import { Logger } from '@/lib/logger';

class OTELTracer {
    private sdk: NodeSDK;

    private logger: Logger;

    constructor() {
        const traceExporter = new OTLPTraceExporter({
            url: opentelemetryConfig.EXPORTER_TRACES_ENDPOINT,
            headers: {
                [opentelemetryConfig.EXPORTER_API_KEY_NAME]: opentelemetryConfig.EXPORTER_API_KEY,
            },
        });

        const resource = new Resource({
            [ATTR_SERVICE_NAME]: this.serviceName,
            SampleRate: opentelemetryConfig.SAMPLE_RATE,
        });
        const spanProcessor = new BatchSpanProcessor(traceExporter);
        const provider = new NodeTracerProvider({
            resource,
            spanProcessors: [spanProcessor],
        });
        provider.register();

        this.sdk = new NodeSDK({
            traceExporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false,
                    },
                }),
            ],
            sampler: new TraceIdRatioBasedSampler(1 / opentelemetryConfig.SAMPLE_RATE),
        });

        this.logger = new Logger(this.constructor.name);
    }

    // eslint-disable-next-line class-methods-use-this
    private get serviceName() {
        return `[${nodeEnv}] ${serviceConfig.NAME}`;
    }

    public run(): void {
        try {
            this.sdk.start();
        } catch (err) {
            this.logger.error('Initialization failed', err);
        }
        this.logger.info('Initialized successfully');
    }

    public async shutdown(): Promise<void> {
        try {
            await this.sdk.shutdown();
            this.logger.info('Shutdown successfully');
        } catch (err) {
            this.logger.error('Shutdown failed', err);
        }
    }
}

function main() {
    const tracer = new OTELTracer();
    tracer.run();
    process.on('SIGTERM', async () => {
        try {
            await tracer.shutdown();
        } finally {
            /** empty */
        }
    });
}

main();
