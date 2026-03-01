import Image from "next/image";
import Link from "next/link";
import { GithubIcon } from "../icons/GithubIcon";

export function Footer() {
  return (
    <footer className="relative border-t border-border/20 py-14 md:py-20">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-violet/2 to-transparent pointer-events-none" />

      <div className="max-w-6xl px-6 mx-auto relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
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
              GitHub-native AI engineering. Open source and free forever.
            </p>
            <Link
              href="https://github.com/asgarovf/locusai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              Star on GitHub
            </Link>
          </div>

          {/* CLI */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              CLI Commands
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/init"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus init
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/plan"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus plan
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/run"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus run
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/exec"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus exec
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/review"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus review
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/issue"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus issue
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/sprint"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus sprint
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/sandbox"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus sandbox
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/cli/iterate"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                >
                  locus iterate
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
                  href="/packages"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Packages
                </Link>
              </li>
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
                  href="https://docs.locusai.dev/getting-started/installation"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Getting Started
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.npmjs.com/package/@locusai/cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  npm
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.locusai.dev/getting-started/sandboxing-setup"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sandboxing Setup
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
            </ul>
          </div>

          {/* Community & Legal */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Community
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="https://github.com/asgarovf/locusai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/asgarovf/locusai/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Issues
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/asgarovf/locusai/blob/master/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contributing
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
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
            Open source. GitHub-native. Ship faster.
          </p>
        </div>
      </div>
    </footer>
  );
}
