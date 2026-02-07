"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-logo">
                    <Image src="/images/icon.png" alt="PharmaGo" width={36} height={36} />
                    <span>PharmaGo</span>
                </div>
                <div className="footer-links">
                    <Link href="/privacy">{t.footer.privacy}</Link>
                    <Link href="/terms">{t.footer.terms}</Link>
                    <Link href="mailto:info@pharmago.gr">{t.footer.contact}</Link>
                </div>
            </div>
            <div className="footer-copy">
                © {new Date().getFullYear()} PharmaGo. {t.footer.copy}
            </div>
        </footer>
    );
}
