import { useUi } from '../context/UiContext.jsx';

export default function LiteStrip() {
  const { liteMode } = useUi();

  if (!liteMode) return null;

  return (
    <div
      role="status"
      className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-center text-xs font-medium text-emerald-800 sm:text-sm"
    >
      ⚡ Lite Mode Active — Images & animations disabled for low-network areas.
    </div>
  );
}
