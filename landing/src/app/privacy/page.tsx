import Link from "next/link";
import Image from "next/image";

export const metadata = {
    title: "Privacy Policy | PharmaGo",
    description: "Privacy Policy for PharmaGo - Learn how we protect your data",
};

export default function PrivacyPolicy() {
    return (
        <div className="legal-page">
            <nav className="legal-nav">
                <Link href="/" className="nav-logo">
                    <Image src="/images/icon.png" alt="PharmaGo" width={36} height={36} />
                    <span>PharmaGo</span>
                </Link>
            </nav>

            <main className="legal-content">
                <h1>Privacy Policy for PharmaGo</h1>
                <p className="effective-date"><strong>Effective Date:</strong> February 6, 2026</p>

                <p>PharmaGo ("we," "us," or "our") is dedicated to protecting your privacy. This Privacy Policy explains how we handle information when you use the PharmaGo mobile application.</p>

                <h2>1. Information We Collect</h2>

                <h3>Location Data</h3>
                <p>PharmaGo is designed to help you find nearby pharmacies. To provide this service, we request access to your device's precise location (GPS and network-based).</p>
                <ul>
                    <li><strong>Use of Location:</strong> We use your location only to calculate the distance to pharmacies and display them on the map.</li>
                    <li><strong>No Persistence:</strong> Your precise coordinate data is processed locally on your device or used as a temporary parameter for API requests to fetch pharmacy data. We do <strong>not</strong> store your location history on our servers.</li>
                </ul>

                <h3>Analytics & Crash Reporting</h3>
                <p>We may use anonymous analytics tools to improve app performance. This data does not contain personally identifiable information.</p>

                <h2>2. Information Sharing</h2>
                <p>We do <strong>not</strong> sell, trade, or otherwise transfer your personally identifiable information to outside parties.</p>

                <h2>3. Data Security</h2>
                <p>We implement a variety of security measures to maintain the safety of your information. However, no method of transmission over the internet or electronic storage is 100% secure.</p>

                <h2>4. Third-Party Services</h2>
                <p>Our app uses Google Maps API (or similar map providers) to display maps and calculate distances. These services may collect information as described in their respective privacy policies.</p>

                <h2>5. Changes to This Policy</h2>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

                <h2>6. Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                <p><strong>Email:</strong> <a href="mailto:privacy@pharmagoapp.gr">privacy@pharmagoapp.gr</a></p>
            </main>

            <footer className="legal-footer">
                <p>© {new Date().getFullYear()} PharmaGo. All rights reserved.</p>
                <Link href="/">← Back to Home</Link>
            </footer>
        </div>
    );
}
