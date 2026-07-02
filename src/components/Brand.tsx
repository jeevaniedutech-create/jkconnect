import logoAsset from "@/assets/jeevani-logo.png.asset.json";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src={logoAsset.url} alt="Jeevani Institute of Mind Care" className={className} draggable={false} />;
}

export const TAGLINE = "A premium live learning platform of Jeevani Institute of Mind Care";
export const BRAND = "Jeevani Connect";
