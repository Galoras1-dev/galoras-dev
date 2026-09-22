import { Link } from "react-router-dom";
import { Zap, Linkedin, Twitter, Instagram, Mail } from "lucide-react";
const galorasLogo = "/galoras-logo.jpg";

const footerLinks = {
  platform: [
    { name: "Coaching Exchange", href: "/coaching" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Apply to Coach", href: "/apply" },
    { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
  ],
  resources: [
    { name: "FAQ", href: "/faq" },
  ],
  legal: [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Payments & Refunds", href: "/legal/payments" },
    { name: "Coach Agreement", href: "/legal/coach-agreement" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/company/galoras" },
  { name: "Twitter", icon: Twitter, href: "https://twitter.com/galoras" },
  { name: "Instagram", icon: Instagram, href: "https://instagram.com/galoras" },
  // hello@ is not a mailbox. Every click on this icon bounced.
  { name: "Email", icon: Mail, href: "mailto:conor@galoras.com" },
];

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-white">
      <div className="container-wide section-padding">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img src={galorasLogo} alt="Galoras" className="h-12 w-auto" />
            </Link>
            <p className="text-zinc-100 text-sm leading-relaxed mb-6 max-w-sm">
              Galoras is a performance-led coaching exchange designed to identify and deploy real execution capability for individuals and organizations operating under pressure.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted/10 hover:bg-primary/20 hover:text-primary transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-primary">
              Platform
            </h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-100 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-primary">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-100 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-primary">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-100 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-primary">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-100 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-100">
              © {new Date().getFullYear()} Galoras. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-100">
              <Zap className="h-4 w-4 text-primary" />
              <span>Powered by elite performance</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
