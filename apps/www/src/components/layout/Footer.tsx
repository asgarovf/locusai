export function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 md:px-8 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by{" "}
          <a
            href="https://github.com/asgarovf"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            asgarovf
          </a>
          . Local-first. Open Source.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Locus AI. MIT License.
        </p>
      </div>
    </footer>
  );
}
