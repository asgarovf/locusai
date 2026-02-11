import Image from "next/image";
import Link from "next/link";
import { GithubIcon } from "../icons/GithubIcon";

export function Footer() {
  return (
    <footer className="relative border-t border-border/20 py-14 md:py-20">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-violet/2 to-transparent pointer-events-none" />

      <div className="max-w-6xl px-6 mx-auto relative">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo.png"
              alt="Locus"
              width={80}
              height={30}
              className="mb-4"
            />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mb-4">
              AI-native project management for engineering teams. Open source.
            </p>
            <Link
              href="https://github.com/asgarovf/locusai"
              target="_blank"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              Star on GitHub
            </Link>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Products
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/products/agents"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  AI Agents
                </Link>
              </li>
              <li>
                <Link
                  href="/products/planning"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sprint Planning
                </Link>
              </li>
              <li>
                <Link
                  href="/products/review"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Code Review
                </Link>
              </li>
              <li>
                <Link
                  href="/products/telegram"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Telegram Bot
                </Link>
              </li>
              <li>
                <Link
                  href="/products/self-hosting"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Self-Hosting
                </Link>
              </li>
              <li>
                <Link
                  href="https://app.locusai.dev"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="https://docs.locusai.dev"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/cli"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  CLI Reference
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="/integrations"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Integrations
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.npmjs.com/package/@locusai/cli"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  npm
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Community
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="https://github.com/asgarovf/locusai"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/asgarovf/locusai/issues"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Issues
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/asgarovf/locusai/blob/master/CONTRIBUTING.md"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contributing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="https://app.locusai.dev/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="https://app.locusai.dev/register"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Locus AI. MIT License.
          </p>
          <p className="text-xs text-muted-foreground">
            Open source. Run locally. Ship faster.
          </p>
        </div>
      </div>
    </footer>
  );
}
