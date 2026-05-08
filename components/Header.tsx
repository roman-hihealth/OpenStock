import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";
import MarketSwitcher from "@/components/MarketSwitcher";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {getMarketFromCookie} from "@/lib/market/cookie";

const Header = async ({ user }: { user: User }) => {
    const [initialStocks, market] = await Promise.all([
        searchStocks(),
        getMarketFromCookie(),
    ]);

    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/" className="flex items-center justify-center gap-2">
                    <Image
                        src="/assets/images/logo.png"
                        alt="OpenStock"
                        width={200}
                        height={50}
                    />
                </Link>
                <nav className="hidden sm:block">
                    <NavItems initialStocks={initialStocks}/>
                </nav>

                <div className="flex items-center gap-3">
                    <MarketSwitcher market={market} />
                    <UserDropdown user={user} initialStocks={initialStocks} />
                </div>
            </div>
        </header>
    )
}
export default Header