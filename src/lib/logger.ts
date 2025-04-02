/* eslint-disable max-classes-per-file */
// Builtin.
import process from 'process';
// 3rd party.
import {
    createLogger, config, format, transports, Logger as WinstonLogger,
} from 'winston';
import 'winston-daily-rotate-file';
// Internal.
import { logConfig, serviceConfig } from '@/config';
import { isEmpty } from '@/lib/utils';

type ErrorWithStack = Error & { stack?: object };
type ErrorWithCause = Error & { cause?: ErrorWithStack };

const loggerConfig = {
    level: logConfig.LEVEL,
    levels: {
        ...config.npm.levels,
    },
    format: format.combine(
        format.errors({ stack: true }),
        format.timestamp(),
        format.json(),
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.prettyPrint(),
                format.printf(
                    ({
                        level, message, timestamp, loggerName, err, stack, ...meta
                    }) => {
                        let metaStr;
                        try {
                            metaStr = isEmpty(meta) ? '' : ` ${JSON.stringify(meta)}`;
                        } catch {
                            metaStr = '';
                        }
                        const stackTrace = ((err as ErrorWithStack)?.stack || stack)
                            ? `\r\n${(err as ErrorWithStack)?.stack || stack}`
                            : '';
                        return `[${level.toUpperCase()}] ${timestamp} [${process.pid}]: [${loggerName}] ${message}${metaStr}${stackTrace}`;
                    },
                ),
            ),
            handleExceptions: true,
            level: logConfig.LEVEL,
            silent: logConfig.SILENT,
        }),

        ...(logConfig.FILE_LOGGING
            ? [
                new transports.DailyRotateFile({
                    dirname: logConfig.FILE_DIR,
                    filename: logConfig.FILE_NAME,
                    datePattern: logConfig.FILE_DATE_PATTERN,
                    silent: logConfig.SILENT,
                    level: logConfig.FILE_LEVEL,
                    handleExceptions: true,
                    zippedArchive: false,
                    utc: true,
                    format: format.combine(
                        format.printf(({
                            err, ...meta
                        }) => {
                            const logObject = { ...meta, err };
                            if (err) {
                                logObject.err = {
                                    message: (err as ErrorWithStack)?.message,
                                    stack: (err as ErrorWithStack)?.stack,
                                    ...((err as ErrorWithCause).cause && {
                                        cause: {
                                            message: (err as ErrorWithCause).cause.message,
                                            stack: (err as ErrorWithCause)?.cause?.stack,
                                        },
                                    }),
                                };
                            }
                            return JSON.stringify(logObject);
                        }),
                    ),
                }),
            ]
            : []
        ),
    ],
};

const baseLogger: WinstonLogger = createLogger(loggerConfig);

const LoggerClass = (): new () => WinstonLogger => (class {} as never);

export class Logger extends LoggerClass() {
    private static FORCED_EXTRAS = {
        app: serviceConfig.APP_NAME,
        service: serviceConfig.NAME,
    };

    private _logger;

    // Define a handler that forwards all calls to underlying logger.
    private handler = {
        get(target: Logger, prop: string, receiver: unknown) {
            return Reflect.get(target._logger, prop, receiver);
        },
    };

    constructor(name: string, extra: Record<string, unknown> = {}) {
        super();
        this._logger = baseLogger.child({
            ...Logger.FORCED_EXTRAS,
            loggerName: name,
            ...extra,
        });
        return new Proxy(this, this.handler);
    }
}
