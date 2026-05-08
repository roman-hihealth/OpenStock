import 'server-only';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4/data';
const FINMIND_TOKEN = process.env.FINMIND_TOKEN ?? '';

type FinMindEnvelope<T> = {
    msg?: string;
    status?: number;
    data?: T[];
};

export type FinMindParams = Record<string, string | number | undefined>;

export class FinMindError extends Error {
    constructor(
        message: string,
        readonly dataset: string,
        readonly status?: number
    ) {
        super(message);
        this.name = 'FinMindError';
    }
}

/**
 * Calls https://api.finmindtrade.com/api/v4/data with the given dataset.
 *
 * - `revalidateSeconds`:
 *     omit / 0 → no fetch cache (real-time)
 *     >0       → Next.js fetch cache + ISR with given TTL
 * - Throws `FinMindError` on transport failure or `status !== 200` envelope.
 *   Caller is responsible for try/catch and graceful degradation.
 */
export async function fetchFinMind<T>(
    dataset: string,
    params: FinMindParams = {},
    revalidateSeconds?: number
): Promise<T[]> {
    if (!FINMIND_TOKEN) {
        // Anonymous tier still works but the rate limit drops to ~50/hour.
        // Surface this once to the dev console rather than failing hard.
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[finmind] FINMIND_TOKEN not set; falling back to anonymous quota');
        }
    }

    const query = new URLSearchParams({ dataset });
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        query.set(key, String(value));
    }
    if (FINMIND_TOKEN) query.set('token', FINMIND_TOKEN);

    const url = `${FINMIND_BASE_URL}?${query.toString()}`;

    const options: RequestInit & { next?: { revalidate?: number } } =
        revalidateSeconds && revalidateSeconds > 0
            ? { cache: 'force-cache', next: { revalidate: revalidateSeconds } }
            : { cache: 'no-store' };

    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new FinMindError(`HTTP ${res.status}: ${text}`, dataset, res.status);
    }

    const json = (await res.json()) as FinMindEnvelope<T>;
    if (json.status !== 200) {
        throw new FinMindError(json.msg ?? 'unknown error', dataset, json.status);
    }

    return json.data ?? [];
}
