import { Schema, model, models, type Document, type Model } from 'mongoose';
import type { Market } from '@/lib/market/types';

export interface WatchlistItem extends Document {
    userId: string;
    symbol: string;
    company: string;
    market: Market;
    addedAt: Date;
}

const WatchlistSchema = new Schema<WatchlistItem>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        company: { type: String, required: true, trim: true },
        market: { type: String, enum: ['US', 'TW'], required: true, default: 'US' },
        addedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

// One row per (user, symbol, market). Lets the same ticker exist in two markets
// for the same user (e.g. dual-listed names) without collisions.
WatchlistSchema.index({ userId: 1, symbol: 1, market: 1 }, { unique: true });

export const Watchlist: Model<WatchlistItem> =
    (models?.Watchlist as Model<WatchlistItem>) || model<WatchlistItem>('Watchlist', WatchlistSchema);
