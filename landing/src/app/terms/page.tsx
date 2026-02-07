import Link from "next/link";
import Image from "next/image";

export const metadata = {
    title: "Terms and Conditions | PharmaGo",
    description: "Terms and Conditions for PharmaGo mobile application",
};

export default function TermsAndConditions() {
    return (
        <div className="legal-page">
            <nav className="legal-nav">
                <Link href="/" className="nav-logo">
                    <Image src="/images/icon.png" alt="PharmaGo" width={36} height={36} />
                    <span>PharmaGo</span>
                </Link>
            </nav>

            <main className="legal-content">
                <h1>Terms and Conditions for PharmaGo</h1>
                <p className="effective-date"><strong>Effective Date:</strong> February 6, 2026</p>

                <p>Welcome to PharmaGo. By downloading, installing, or using the PharmaGo mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). Please read them carefully.</p>

                <h2>1. Acceptance of Terms</h2>
                <p>By accessing or using PharmaGo, you confirm that you have read, understood, and agree to these Terms. If you do not agree, please do not use the App.</p>

                <h2>2. Description of Service</h2>
                <p>PharmaGo is a mobile application that helps users locate on-duty pharmacies in Greece. The App displays pharmacy locations, contact information, and operating hours based on publicly available data.</p>

                <h2>3. Location Services</h2>

                <h3>3.1 Use of Location Data</h3>
                <p>PharmaGo requires access to your device's location to function properly. This allows us to:</p>
                <ul>
                    <li>Display pharmacies near your current location</li>
                    <li>Calculate and show distances to pharmacies</li>
                    <li>Provide walking/driving directions via external map applications</li>
                </ul>

                <h3>3.2 Location Data Handling</h3>
                <ul>
                    <li><strong>Your location is processed locally on your device</strong> or used temporarily to request nearby pharmacy data from our servers.</li>
                    <li><strong>We do not store, log, or retain your location history.</strong></li>
                    <li>Location access is only requested when you actively use the App.</li>
                    <li>You may disable location access at any time through your device settings, but this will limit the App's functionality.</li>
                </ul>

                <h2>4. No Account Required</h2>
                <p>PharmaGo does not require user registration or authentication. We do not collect:</p>
                <ul>
                    <li>Names or email addresses</li>
                    <li>Phone numbers</li>
                    <li>Payment information</li>
                    <li>Any personal identifiers</li>
                </ul>

                <h2>5. Disclaimer of Warranties</h2>

                <h3>5.1 Information Accuracy</h3>
                <p>Pharmacy information (hours, addresses, phone numbers) is sourced from official pharmacy associations and public databases. While we strive for accuracy:</p>
                <ul>
                    <li><strong>We do not guarantee</strong> that all information is 100% accurate or up-to-date.</li>
                    <li>Operating hours may change without notice, especially during holidays.</li>
                    <li>Always call ahead to confirm a pharmacy is open before traveling.</li>
                </ul>

                <h3>5.2 "As Is" Service</h3>
                <p>The App is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied. We do not warrant that:</p>
                <ul>
                    <li>The App will be uninterrupted or error-free</li>
                    <li>Defects will be corrected</li>
                    <li>The App is free of viruses or harmful components</li>
                </ul>

                <h2>6. Limitation of Liability</h2>
                <p>To the fullest extent permitted by law, PharmaGo and its developers shall not be liable for:</p>
                <ul>
                    <li>Any indirect, incidental, special, or consequential damages</li>
                    <li>Loss of data, profits, or business opportunities</li>
                    <li>Any harm resulting from reliance on pharmacy information provided by the App</li>
                    <li>Circumstances where a pharmacy is unexpectedly closed</li>
                </ul>

                <h2>7. Emergency Services</h2>
                <p>PharmaGo provides quick-dial buttons for emergency services (166, 100, 199, 112) as a convenience feature. These buttons simply initiate a phone call to official emergency numbers. <strong>In case of a medical emergency, always call emergency services directly.</strong></p>

                <h2>8. Third-Party Services</h2>
                <p>The App integrates with:</p>
                <ul>
                    <li><strong>Apple Maps / Google Maps:</strong> For navigation and directions</li>
                    <li><strong>Phone App:</strong> For calling pharmacies and emergency services</li>
                </ul>
                <p>Your use of these third-party services is subject to their respective terms and privacy policies.</p>

                <h2>9. Intellectual Property</h2>
                <p>All content, design, graphics, and functionality within PharmaGo are the property of the developers and are protected by applicable intellectual property laws. You may not:</p>
                <ul>
                    <li>Copy, modify, or distribute any part of the App</li>
                    <li>Reverse-engineer or attempt to extract source code</li>
                    <li>Use the App for commercial purposes without permission</li>
                </ul>

                <h2>10. Modifications to Terms</h2>
                <p>We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms. We encourage you to review this page periodically.</p>

                <h2>11. Governing Law</h2>
                <p>These Terms shall be governed by and construed in accordance with the laws of Greece. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Athens, Greece.</p>

                <h2>12. Contact Us</h2>
                <p>If you have questions or concerns about these Terms, please contact us at:</p>
                <p><strong>Email:</strong> <a href="mailto:legal@pharmago.gr">legal@pharmago.gr</a></p>

                <p className="last-updated"><em>Last Updated: February 6, 2026</em></p>
            </main>

            <footer className="legal-footer">
                <p>© {new Date().getFullYear()} PharmaGo. All rights reserved.</p>
                <Link href="/">← Back to Home</Link>
            </footer>
        </div>
    );
}
