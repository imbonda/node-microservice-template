// 3rd party.
import { type Tracer } from '@opentelemetry/api';
import Bottleneck from 'bottleneck';
// Internal.
import type { Logger } from '@/lib/logger';

interface SafeOptions {
    defaultValue?: unknown,
    silent?: boolean,
}

export function safe(
    { defaultValue, silent }: SafeOptions = {},
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        descriptor.value = function wrapper(...args: unknown[]) {
            let result;

            try {
                result = originalMethod.apply(this, args);
            } catch (err) {
                if (!silent) {
                    (this as { logger: Logger })?.logger.error(err);
                }
                return defaultValue;
            }

            if (result.then) {
                return result.catch((err: Error) => {
                    if (!silent) {
                        (this as { logger: Logger })?.logger.error(err);
                    }
                    return defaultValue;
                });
            }

            return result;
        };
        return descriptor;
    };
}

interface ThrottleOptions {
    maxConcurrent?: number,
    maxInTimeFrame?: number,
    delayMs?: number,
    queueSize?: number,
    skip?: boolean,
}

export function throttle(
    {
        maxConcurrent, maxInTimeFrame, delayMs, queueSize, skip,
    }: ThrottleOptions,
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        const limiter = new Bottleneck({
            maxConcurrent,
            minTime: delayMs,
            ...((maxInTimeFrame !== undefined) && {
                reservoir: maxInTimeFrame,
                reservoirRefreshAmount: maxInTimeFrame,
                reservoirRefreshInterval: delayMs,
            }),
            ...((queueSize !== undefined) && {
                highWater: queueSize,
                strategy: skip
                    ? Bottleneck.strategy.OVERFLOW
                    : Bottleneck.strategy.BLOCK,
            }),
        });
        const wrapped = limiter.wrap(originalMethod);
        descriptor.value = wrapped;
        return descriptor;
    };
}

interface TraceOptions {
    name: string;
    root: boolean;
    sync?: boolean;
}

export function trace(
    { name, root, sync }: TraceOptions,
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        if (sync) {
            descriptor.value = function wrapper(...args: unknown[]) {
                return (this as { tracer: Tracer }).tracer.startActiveSpan(
                    name,
                    { root },
                    (span) => {
                        try {
                            return originalMethod.apply(this, args);
                        } finally {
                            span.end();
                        }
                    },
                );
            };
        } else {
            descriptor.value = function wrapper(...args: unknown[]) {
                return (this as { tracer: Tracer }).tracer.startActiveSpan(
                    name,
                    { root },
                    async (span) => originalMethod
                        .apply(this, args)
                        .finally(() => span.end()),
                );
            };
        }
        return descriptor;
    };
}
