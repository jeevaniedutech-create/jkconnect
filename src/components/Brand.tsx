const LOGO_URL = "https://www.jeevanimindcare.in/assets/img/logo/logo.jpg";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src={LOGO_URL} alt="Jeevani Institute of Mind Care" className={className} draggable={false} />;
}

export const TAGLINE = "A premium live learning platform of Jeevani Institute of Mind Care";
export const BRAND = "Jeevani Connect";
