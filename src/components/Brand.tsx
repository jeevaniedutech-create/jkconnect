const LOGO_URL = "https://www.jeevanimindcare.in/assets/img/logo/logo.png";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <img
      src={LOGO_URL}
      alt="Jeevani Institute of Mind Care"
      className={`object-contain select-none [image-rendering:-webkit-optimize-contrast] ${className}`}
      draggable={false}
      loading="eager"
      decoding="async"
    />
  );
}

export const TAGLINE = "A premium live learning platform of Jeevani Institute of Mind Care";
export const BRAND = "Jeevani Connect";


