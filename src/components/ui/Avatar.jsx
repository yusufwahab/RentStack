// Every avatar in the app — landlord or tenant — is generated from initials
// via ui-avatars.com. We never use stock photos of people inside the app;
// only the landing page uses lifestyle photography, and even that is never
// a portrait.
export default function Avatar({ name, className = "w-9 h-9", bg = "C9A84C", color = "fff" }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=${color}&bold=true&size=128`;
  return <img src={url} alt={name} className={`${className} rounded-full object-cover shrink-0`} />;
}
