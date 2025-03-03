// Builtin.
import path from 'path';
// 3rd party.
import dotenv from 'dotenv';
// Internal.
import { cmdArgs } from '@/args';

const args = cmdArgs();

export const nodeEnv = process.env.NODE_ENV?.toLowerCase();

// Load dotenv variables.
const dotEnvFilename = () => '.env';
dotenv.config({ path: path.join(__dirname, '..', dotEnvFilename()) });

/**
 * Mode.
 */
export const envConfig = {
    IS_DEV: nodeEnv === 'dev',
    IS_PROD: nodeEnv === 'prod',
};

/**
 * Log.
 */
export const logConfig = {
    SILENT: process.env.LOGGER_SILENT?.toLocaleLowerCase() === 'true',
    LEVEL: process.env.LOGGER_LEVEL?.toLocaleLowerCase() || 'debug',
    FILE_LOGGING: process.env.LOGGER_FILE_TRANSPORT?.toLocaleLowerCase() === 'true',
    FILE_LEVEL: process.env.LOGGER_FILE_LEVEL?.toLocaleLowerCase() || 'info',
    FILE_DIR: process.env.LOGGER_FILE_DIR_PATH,
    FILE_NAME: process.env.LOGGER_FILE_NAME_PATTERN,
    FILE_DATE_PATTERN: process.env.LOGGER_FILE_DATE_PATTERN,
};

/**
 * Opentelemetry.
 */
export const opentelemetryConfig = {
    EXPORTER_API_KEY: process.env.OTEL_EXPORTER_API_KEY!,
    EXPORTER_API_KEY_NAME: process.env.OTEL_EXPORTER_API_KEY_NAME!,
    EXPORTER_TRACES_ENDPOINT: process.env.OTEL_EXPORTER_TRACES_ENDPOINT!,
    SAMPLE_RATE: parseInt(process.env.OTEL_SAMPLE_RATE || '1'),
};

/**
 * Social.
 */
export const telegramConfig = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
    NOTIFICATIONS_CHAT_ID: process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID!,
};

/**
 * Service identifiers.
 */
let serviceName: string;

export const serviceConfig = {
    APP_NAME: process.env.APP_NAME,
    NAME: serviceName,
};

const REQUIRED_CONFIGS: object[] = [
    /** Add required args. */
];

export function validateConfig() {
    REQUIRED_CONFIGS.forEach(validateSubConfig);
}

function validateSubConfig(subConfig: object) {
    Object.entries(subConfig).forEach(([key, value]) => {
        if (typeof value === 'object') {
            validateSubConfig(value);
        } else if (value === undefined) {
            throw new Error(`Missing configuration for ${key}`);
        }
    });
}
