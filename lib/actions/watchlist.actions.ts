'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { revalidatePath } from 'next/cache';
import { getMarketFromCookie } from '@/lib/market/cookie';

// -- CRUD Operations --

export async function addToWatchlist(userId: string, symbol: string, company: string) {
    try {
        const market = await getMarketFromCookie();
        await connectToDatabase();

        const newItem = await Watchlist.findOneAndUpdate(
            { userId, symbol: symbol.toUpperCase(), market },
            {
                userId,
                symbol: symbol.toUpperCase(),
                company,
                market,
                addedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        revalidatePath('/watchlist');
        return JSON.parse(JSON.stringify(newItem));
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        throw new Error('Failed to add to watchlist');
    }
}

export async function removeFromWatchlist(userId: string, symbol: string) {
    try {
        const market = await getMarketFromCookie();
        await connectToDatabase();
        await Watchlist.findOneAndDelete({ userId, symbol: symbol.toUpperCase(), market });
        revalidatePath('/watchlist');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        throw new Error('Failed to remove from watchlist');
    }
}

export async function getUserWatchlist(userId: string) {
    try {
        const market = await getMarketFromCookie();
        await connectToDatabase();
        const watchlist = await Watchlist.find({ userId, market }).sort({ addedAt: -1 });
        return JSON.parse(JSON.stringify(watchlist));
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        return [];
    }
}

// Check if a symbol is in the user's watchlist
export async function isStockInWatchlist(userId: string, symbol: string) {
    try {
        const market = await getMarketFromCookie();
        await connectToDatabase();
        const item = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase(), market });
        return !!item;
    } catch (error) {
        console.error('Error checking watchlist status:', error);
        return false;
    }
}

// -- Legacy / Inngest support --
// Returns symbols across every market. P3 will introduce a market-scoped
// variant for fan-out cron handlers; until then the broadcast email keeps
// receiving the union.
export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB connection not found');

        // Better Auth stores users in the "user" collection
        const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

        if (!user) return [];

        const userId = (user.id as string) || String(user._id || '');
        if (!userId) return [];

        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}
