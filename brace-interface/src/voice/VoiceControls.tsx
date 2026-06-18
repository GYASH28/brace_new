import { Bot, Code2, Mic, Paperclip, Send, SlidersHorizontal, Square, Workflow } from "lucide-react";
import { memo } from "react";
import type { PageId, VoiceOrbState } from "../types";

type VoiceControlsProps = {
  input: string;
  mode: string;
  onAttach: () => void;
  onInput: (value: string) => void;
  onMode: (mode: string) => void;
  onNavigate: (page: PageId) => void;
  onSend: () => void;
  onStop: () => void;
  onVoice: () => void;
  orbState: VoiceOrbState;
};

const modes = [
  { id: "agent", label: "Agent", icon: Workflow },
  { id: "chat", label: "Chat", icon: Bot },
  { id: "coding", label: "Code", icon: Code2 },
  { id: "voice", label: "Voice", icon: Mic },
];

export const VoiceControls = memo(function VoiceControls({ input, mode, onAttach, onInput, onMode, onNavigate, onSend, onStop, onVoice, orbState }: VoiceControlsProps) {
  const placeholder = mode === "coding" ? "Ask B.R.A.C.E to debug, build, or explain code..." : mode === "agent" ? "Command B.R.A.C.E with a safe local task..." : mode === "voice" ? "Speak or type your command..." : "Ask B.R.A.C.E anything...";

  return (
    <div className="command-dock mx-auto w-full max-w-4xl">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="mode-segment" aria-label="Assistant mode">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = item.id === mode;
            return (
              <button
                aria-pressed={active}
                className={["mode-segment-button", active ? "mode-segment-button-active" : ""].join(" ")}
                key={item.id}
                onClick={() => onMode(item.id)}
                title={`${item.label} mode`}
                type="button"
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="command-dock-input flex min-w-0 flex-1 items-center gap-2">
          <button className="icon-button" onClick={onAttach} title="Attach file" type="button">
            <Paperclip size={18} />
          </button>
          <textarea
            className="max-h-24 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
            onChange={(event) => onInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={placeholder}
            rows={1}
            value={input}
          />
          <button className={["icon-button", orbState === "listening" ? "voice-live-button" : ""].join(" ")} onClick={orbState === "speaking" ? onStop : onVoice} title={orbState === "speaking" ? "Stop speaking" : "Start voice"} type="button">
            {orbState === "speaking" ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <button className="send-button" onClick={onSend} title="Send" type="button">
            <Send size={17} />
          </button>
        </div>
        <button className="icon-button" onClick={() => onNavigate("voice")} title="Voice settings" type="button">
          <SlidersHorizontal size={18} />
        </button>
      </div>
      <div className="mt-2 hidden justify-between px-2 text-[10px] uppercase tracking-[0.18em] text-slate-600 sm:flex">
        <span>Enter to send</span>
        <span>Shift + Enter for new line</span>
      </div>
    </div>
  );
});
