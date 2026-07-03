export default function EmptyState({ image, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {image && (
        <img
          src={image}
          alt=""
          className="w-40 h-40 rounded-full object-cover mx-auto opacity-60"
        />
      )}
      <p className="text-sm text-[#64748B] text-center mt-4">{message}</p>
      {action}
    </div>
  );
}
