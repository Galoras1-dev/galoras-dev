import { Layout } from "@/components/layout";

export default function CoachAgreement() {
  return (
    <Layout>
      <section className="relative pt-32 pb-20 bg-zinc-950">
        <div className="container-wide max-w-3xl">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-display font-black text-white uppercase mb-2">Coach Agreement</h1>
          <p className="text-zinc-500 text-sm">Galoras Operations LLC — Last updated: January 2026</p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide max-w-3xl prose prose-zinc dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-a:text-primary">
          <p>
            This Coach Agreement is between Galoras Operations LLC, registered at Suite 800,
            1200 Brickell Avenue, FL 33131, Miami, USA, and the coach accepting these terms.
            By completing the coach registration process and checking the agreement box, you
            accept all terms below.
          </p>

          <h2>1. Independent Contractor</h2>
          <p>
            You confirm you are an independent professional, not an employee, agent, or partner
            of Galoras. You are solely responsible for your own taxes, insurance, and compliance
            with applicable laws. Nothing in this agreement creates an employment relationship.
            This applies equally under US federal law and Canadian federal/provincial law.
          </p>

          <h2>2. Professional Standards</h2>
          <p>
            You agree to provide coaching services ethically, lawfully, and accurately. You must
            not misrepresent your qualifications, experience, or credentials. You are responsible
            for ensuring your coaching practice complies with all applicable professional and
            regulatory requirements in your jurisdiction.
          </p>

          <h2>3. Use of Brand</h2>
          <p>
            Any Galoras badges, logos, or marks are licensed to you on a
            revocable, non-exclusive basis. They must be used in accordance with Galoras brand
            guidelines. Galoras may revoke usage rights at any time without notice.
          </p>

          <h2>4. Platform Access and Payments</h2>
          <p>
            Your subscription provides access to the Galoras coaching platform and visibility
            to potential clients. Galoras does not guarantee any volume of work, bookings, or
            income. Session fees are set by you and collected through the platform. Galoras
            retains a platform fee as disclosed at the time of subscription.
          </p>

          <h2>5. Content Licence</h2>
          <p>
            You grant Galoras a non-exclusive, worldwide, royalty-free licence to use your
            profile content, photo, bio, and credentials for platform display and marketing
            purposes for the duration of your active subscription.
          </p>

          <h2>6. Confidentiality</h2>
          <p>
            You must maintain the confidentiality of all client information. You must not share
            client details with third parties without explicit consent. This obligation survives
            termination of this agreement.
          </p>

          <h2>7. Removal and Suspension</h2>
          <p>
            Galoras may suspend or remove coaches for breach of this agreement, conduct that poses
            reputational risk, verified client complaints, or failure to maintain professional
            standards. Where possible, Galoras will provide notice before removal.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            Galoras is not liable for any outcomes of coaching relationships, disputes with
            clients, or loss of business. To the maximum extent permitted by law, Galoras's
            liability is limited to the subscription fees paid in the 30 days prior to any claim.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            This agreement is governed by the laws of the State of Florida, USA. Canadian coaches
            retain rights under applicable provincial employment and contractor legislation where
            mandatory.
          </p>

          <h2>10. Contact</h2>
          <p>
            Coach support: <a href="mailto:coaches@galoras.com">coaches@galoras.com</a>
          </p>
        </div>
      </section>
    </Layout>
  );
}
