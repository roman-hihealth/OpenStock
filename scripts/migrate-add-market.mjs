/**
 * One-shot migration for the OpenStock dual-market rollout.
 *
 * - Backfills `market: 'US'` on every watchlist + alert document missing the field.
 * - Drops the legacy unique index `userId_1_symbol_1` on watchlists so the new
 *   compound `userId_1_symbol_1_market_1` index can take over.
 *
 * Run once after deploying the new schema:
 *   node scripts/migrate-add-market.mjs
 *
 * Idempotent: safe to re-run. Reads MONGODB_URI from .env.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
}

async function backfillMarket(db, collectionName) {
    const result = await db.collection(collectionName).updateMany(
        { market: { $exists: false } },
        { $set: { market: 'US' } }
    );
    console.log(`[${collectionName}] backfilled market=US for ${result.modifiedCount} doc(s)`);
}

async function dropLegacyWatchlistIndex(db) {
    try {
        await db.collection('watchlists').dropIndex('userId_1_symbol_1');
        console.log('[watchlists] dropped legacy index userId_1_symbol_1');
    } catch (err) {
        if (err?.codeName === 'IndexNotFound') {
            console.log('[watchlists] legacy index already absent (skipped)');
        } else {
            throw err;
        }
    }
}

async function main() {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false, family: 4 });
    const db = mongoose.connection.db;
    if (!db) throw new Error('Mongoose connection has no db handle');

    await backfillMarket(db, 'watchlists');
    await backfillMarket(db, 'alerts');
    await dropLegacyWatchlistIndex(db);

    await mongoose.disconnect();
    console.log('Migration complete.');
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
