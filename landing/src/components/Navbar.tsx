"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
    const { lang, t, toggleLanguage } = useLanguage();

    return (
        <nav className="navbar">
            <div className="nav-container">
                <Link href="/" className="nav-logo">
                    <Image src="/images/icon.png" alt="PharmaGo" width={42} height={42} />
                    <span>PharmaGo</span>
                </Link>
                <div className="nav-right">
                    <button className="lang-toggle" onClick={toggleLanguage}>
                        {lang === "el" ? "🇬🇧 EN" : "🇬🇷 EL"}
                    </button>
                    <Link href="#download" className="nav-cta">
                        {t.nav.download}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
