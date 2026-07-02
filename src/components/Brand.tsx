import logoAsset from "@/assets/jeevani-logo.png.asset.json";

const LOGO_URL = logoAsset.url;

export function Logo({ className = "h-10 w-auto max-w-[10rem]" }: { className?: string }) {
  return (
    <img
      src={LOGO_URL}
      alt="Jeevani Institute of Mind Care"
      className={`object-contain select-none ${className}`}
      draggable={false}
      loading="eager"
      decoding="async"
    />
  );
}

export const TAGLINE = "A premium live learning platform of Jeevani Institute of Mind Care";
export const BRAND = "Jeevani Connect";

