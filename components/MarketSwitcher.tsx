'use client';

import { useTransition } from 'react';
import { switchMarket } from '@/lib/market/actions';
import { MARKETS, type Market } from '@/lib/market/types';
import { cn } from '@/lib/utils';

export default function MarketSwitcher({ market }: { market: Market }) {
    const [pending, startTransition] = useTransition();

    const handleClick = (target: Market) => {
        if (target === market || pending) return;
        startTransition(() => {
            switchMarket(target);
        });
    };

    return (
        <div
            role="tablist"
            aria-label="Market"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 p-0.5"
        >
            {MARKETS.map((m) => {
                const active = m === market;
                return (
                    <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={pending}
                        onClick={() => handleClick(m)}
                        className={cn(
                            'px-3 py-1 text-sm font-medium rounded transition-colors cursor-pointer',
                            active
                                ? 'bg-teal-500 text-black'
                                : 'text-gray-400 hover:text-teal-500',
                            pending && 'cursor-not-allowed opacity-60'
                        )}
                    >
                        {m}
                    </button>
                );
            })}
        </div>
    );
}
