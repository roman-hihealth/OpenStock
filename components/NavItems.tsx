'use client'


import React, { createContext, useContext } from 'react'
import { useTranslations } from 'next-intl';
import {NAV_ITEMS} from "@/lib/constants";
import Link from "next/link";
import {usePathname} from "next/navigation";
import SearchCommand from "@/components/SearchCommand";

// Create context for popup state
const DonatePopupContext = createContext<{
    openDonatePopup: () => void;
}>({
    openDonatePopup: () => {}
});

export const useDonatePopup = () => useContext(DonatePopupContext);

const NavItems = ({initialStocks}: { initialStocks: StockWithWatchlistStatus[]}) => {
    const pathname = usePathname()
    const t = useTranslations('nav')
    const tSearch = useTranslations('search')

    const isActive = (path: string) => {
        if (path ==='/') return pathname === '/'

        return  pathname.startsWith(path);
    }

    const openDonatePopup = () => {
        // Trigger the popup by dispatching a custom event
        window.dispatchEvent(new CustomEvent('open-donate-popup'));
    }

    return (
        <DonatePopupContext.Provider value={{ openDonatePopup }}>
            <ul className="flex flex-col sm:flex-row p-2 gap-3 sm:gap-10 font-medium">
            {NAV_ITEMS.map(({href, labelKey}) => {
                if (href === '/search') return (
                    <li key="search-trigger">
                        <SearchCommand
                            renderAs="text"
                            label={tSearch('addStock')}
                            initialStocks={initialStocks}
                        />
                    </li>
                )
                return <li key={href}>
                    <Link href={href} className={`hover:text-teal-500 transition-colors ${isActive(href) ? 'text-gray-100' : ''}`}>
                        {t(labelKey)}
                    </Link>
                </li>
            })}
        </ul>
        </DonatePopupContext.Provider>
    )
}
export default NavItems
