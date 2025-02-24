export function formatServiceState(service: string, state: string): string {
    return `[${service}] ${state.toUpperCase()}`;
}
