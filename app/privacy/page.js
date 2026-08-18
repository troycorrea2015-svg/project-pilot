import "../release.css";

export const metadata = { title: "Project Pilot Privacy" };

export default function PrivacyPage() {
  return (
    <main className="releaseDocument">
      <header><a href="/">Project Pilot</a><span>Privacy Notice</span></header>
      <article>
        <p className="releaseEyebrow">LAST UPDATED AUGUST 16, 2026</p>
        <h1>How Project Pilot uses project, permit, account, referral, and payment information.</h1>
        <p>Project Pilot collects information needed to create accounts, organize projects, provide guidance, operate Permit Concierge, administer referral credits, calculate contractor matches, process paid services and accepted introductions, and improve the service.</p>

        <h2>Information collected</h2>
        <ul><li>Account details such as name, email, account type, and sign-in records</li><li>Project details such as property location, scope, budget, documents, images, notes, permits, and progress</li><li>Permit Concierge details such as authorization records, communications, application information, correction notes, inspection status, and agency references</li><li>Referral information such as referral codes, which account referred another account, eligibility status, service credits, and qualifying paid orders</li><li>Contractor profile details such as business name, services, registration, license, insurance status, and service area</li><li>Marketplace and paid-service activity such as opportunities, acceptances, checkout references, payment status, refunds, credits, and response history</li><li>Product feedback and basic first-party usage events</li></ul>

        <h2>Payment information</h2>
        <p>Payment card details are entered with the third-party payment processor rather than stored directly in Project Pilot. Project Pilot stores transaction identifiers, amount, status, timestamps, Project Pilot credit applied, and related service or opportunity records needed to confirm service activation, account for revenue, administer referral rewards, and process authorized refunds or disputes.</p>

        <h2>How information is used</h2>
        <p>Information is used to operate accounts, save projects, provide relevant guidance, coordinate requested permit services, administer referral and loyalty credits, identify Best Matches, release contact details after an accepted introduction, send service notifications, prevent abuse, process payments, resolve disputes, and improve the product.</p>

        <h2>Permit service information</h2>
        <p>When a customer requests Permit Concierge, Project Pilot may use the project and contact information the customer supplied to prepare and coordinate the requested administrative permit work. Information may be shared with the relevant authority or service provider only as needed for the authorized workflow and subject to the authority&apos;s own systems and requirements.</p>

        <h2>Referral information</h2>
        <p>When a user joins through a referral link, Project Pilot may associate the new account with the referring account to administer promotional credits and prevent misuse. Project Pilot does not need to expose private project details between the referrer and referred user to operate the referral program.</p>

        <h2>Contact information release</h2>
        <p>A contractor sees an anonymized project summary before acceptance. Homeowner contact information is released only to a contractor who accepts the introduction and completes the required payment, or when Project Pilot expressly waives the fee.</p>

        <h2>Service providers</h2>
        <p>Project Pilot may use hosting, database, authentication, AI, payment, mapping, analytics, and email-delivery providers. These providers receive information needed to perform the configured service.</p>

        <h2>Data choices</h2>
        <p>Users may update account and project information inside the service. Requests concerning account deletion, corrections, or privacy questions should be sent through the Project Pilot support channel shown in the application.</p>

        <h2>Security and retention</h2>
        <p>Project Pilot uses access controls and third-party infrastructure to protect information, but no online service can guarantee absolute security. Information is retained while needed to provide the service, maintain transaction, referral, and permit records, meet legal obligations, resolve disputes, and prevent abuse.</p>

        <h2>Children</h2>
        <p>Project Pilot is intended for adults managing property and professional projects and is not directed to children.</p>

        <div className="releaseNotice"><strong>Business review recommended</strong><p>This notice should be reviewed for the final business entity, support contact, payment configuration, referral program, launch jurisdictions, and applicable privacy requirements before broad paid advertising.</p></div>
      </article>
    </main>
  );
}
