import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="surface-forest flex min-h-dvh flex-col items-center justify-center p-8 text-center text-white">
      <Logo inverse />
      <p className="mt-16 font-display text-8xl text-lime-400">404</p>
      <h1 className="mt-4 font-display text-4xl">This page has moved on.</h1>
      <p className="mt-3 text-white/65">The link may be old. Let’s get you back on track.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" variant="lime">Home</ButtonLink>
        <ButtonLink href="/loans" variant="light">View loans</ButtonLink>
      </div>
    </main>
  );
}
