import "../release.css";

export const metadata = { title: "Project Pilot Privacy" };

export default function PrivacyPage() {
  return (
    <main className="releaseDocument">
      <header><a href="/">Project Pilot</a><span>Privacy Notice</span></header>
      <article>
        <p className="releaseEyebrow">LAST UPDATED JULY 30, 2026</p>
        <h1>How Project Pilot uses project and account information.</h1>
        <p>Project Pilot collects information needed to create accounts, organize projects, provide guidance, calculate contractor matches, process accepted introductions, and improve the service.</p>

        <h2>Information collected</h2>
        <ul><li>Account details such as name, email, account type, and sign-in records</li><li>Project details such as location, scope, budget, documents, notes, permits, and progress</li><li>Contractor profile details such as business name, services, registration, license, insurance status, and service area</li><li>Marketplace activity such as quote requests, matches, acceptances, payments, credits, and response history</li><li>Product feedback and basic first-party usage events</li></ul>

        <h2>How information is used</h2>
        <p>Information is used to operate accounts, save projects, provide relevant guidance, identify Best Matches, release contact details after an accepted introduction, send service notifications, prevent abuse, process payments, resolve disputes, and understand which features need improvement.</p>

        <h2>Contact information release</h2>
        <p>A contractor sees an anonymized project summary before acceptance. Homeowner contact information is released only to a contractor who accepts the introduction and completes the required payment, or when Project Pilot expressly waives the fee.</p>

        <h2>Service providers</h2>
        <p>Project Pilot may use hosting, database, authentication, payment, analytics, and email-delivery providers. These providers receive only the information needed to perform their services.</p>

        <h2>Data choices</h2>
        <p>Users may update account and project information inside the service. Requests concerning account deletion, corrections, or privacy questions should be sent through the Project Pilot support channel shown in the application.</p>

        <h2>Security and retention</h2>
        <p>Project Pilot uses access controls and third-party infrastructure to protect information, but no online service can guarantee absolute security. Information is retained while needed to provide the service, meet legal obligations, resolve disputes, and prevent abuse.</p>

        <h2>Children</h2>
        <p>Project Pilot is intended for adults managing property and professional projects and is not directed to children.</p>

        <div className="releaseNotice"><strong>Launch requirement</strong><p>This notice should be reviewed for the final business entity, support contact, payment provider configuration, and applicable state requirements before live charges are enabled.</p></div>
      </article>
    </main>
  );
}
