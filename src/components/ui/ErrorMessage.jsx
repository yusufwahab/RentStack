export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-600">{message || "Something went wrong."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-4 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] hover:bg-[#FAFAF9] transition-colors duration-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}
