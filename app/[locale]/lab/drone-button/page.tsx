import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import DroneButton from "@/registry/motionshelf/drone-button/drone-button";

// Página de teste do Drone Button: fora do catálogo, do menu e do sitemap.
export const metadata: Metadata = {
  title: "Drone Button (lab)",
  robots: { index: false, follow: false },
};

export default async function DroneButtonLab({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-16 pb-24 sm:px-6">
      <p className="font-mono text-xs text-led-soft">Lab</p>
      <h1 className="display-wide mt-2 text-[clamp(1.75rem,7vw,3rem)] text-text">Drone Button</h1>
      <p className="mt-4 text-muted">
        Move the pointer inside the box: the motors spool up, the drone takes off and flies the button to the cursor,
        banking to move sideways. Leave the box and it lands where it is.
      </p>
      <div className="relative mt-8 h-[440px] rounded-xl border border-edge bg-shelf">
        <DroneButton>Book a demo</DroneButton>
      </div>
      <div className="relative mt-6 h-[260px] rounded-xl border border-edge bg-shelf">
        <DroneButton maxTilt={28} agility={1.6}>
          Agile drone
        </DroneButton>
      </div>
    </div>
  );
}
