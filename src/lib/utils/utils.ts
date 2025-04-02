// 3rd party.
import { v4 as uuidv4 } from 'uuid';

// 3rd party.
export { isEmpty } from 'lodash';

export async function sleep(timeMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeMs);
    });
}

export function getRandomInRange(start: number, end: number) {
    return Math.floor(Math.random() * (end - start + 1)) + start;
}

export function createUUID(length = 32): string {
    return uuidv4()
        .replace(/-/g, '') // Remove dashes.
        .slice(0, length);
}
