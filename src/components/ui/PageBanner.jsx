// Dark banner used for page headers (dashboard welcome, tenant detail,
// reports, tenant portal). A faint low-opacity image sits behind the text as
// texture — never a gradient, never a solid block alone.
export default function PageBanner({ image, height = "h-32", title, subtitle, children }) {
  return (
    <div className={`relative w-full ${height} bg-[#0B1F17] overflow-hidden shrink-0`}>
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.08] grayscale contrast-125"
        />
      )}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-10">
        {title && <h1 className="text-xl md:text-2xl font-semibold text-white">{title}</h1>}
        {subtitle && <p className="text-sm text-[#94A3B8] mt-1">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
