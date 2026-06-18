import { useBraceStore } from "@/store/useBraceStore";
import { Check, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const ICONS = {
  success: Check,
  error: X,
  info: Zap,
};

const BORDER_COLORS = {
  success: "rgba(16,185,129,0.4)",
  error: "rgba(244,63,94,0.4)",
  info: "var(--hairline-cyan)",
};

const ICON_COLORS = {
  success: "var(--accent-emerald)",
  error: "var(--accent-rose)",
  info: "var(--accent-cyan)",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useBraceStore();

  return (
    <div
      className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <motion.div
              key={toast.id}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg max-w-[360px]"
              style={{
                background: "var(--bg-elev-2)",
                border: `1px solid ${BORDER_COLORS[toast.kind]}`,
                boxShadow: "var(--shadow-md)",
                fontSize: 11.5,
              }}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span style={{ color: ICON_COLORS[toast.kind] }} className="shrink-0">
                <Icon size={14} strokeWidth={2} />
              </span>
              <div>
                <div className="font-semibold">{toast.title}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {toast.message}
                </div>
              </div>
              <button
                className="ml-2 shrink-0"
                style={{ color: "var(--text-faint)" }}
                onClick={() => removeToast(toast.id)}
              >
                <X size={10} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
