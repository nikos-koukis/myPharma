"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function Features() {
    const { t } = useLanguage();

    return (
        <section className="features" id="features">
            <div className="section-header">
                <div className="section-tag">{t.features.tag}</div>
                <h2 className="section-title">{t.features.title}</h2>
                <p className="section-desc">{t.features.desc}</p>
            </div>

            <div className="features-grid">
                {t.features.items.map((feature, index) => (
                    <div
                        key={index}
                        className="feature-card glass-card animate-slide"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="feature-icon">{feature.icon}</div>
                        <h3 className="feature-title">{feature.title}</h3>
                        <p className="feature-desc">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
