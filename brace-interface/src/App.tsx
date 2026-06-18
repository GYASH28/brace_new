import { useState, useEffect, useRef } from "react";
import { useBraceStore } from "@/store/useBraceStore";
import NavRail from "@/components/Layout/NavRail";
import TopBar from "@/components/Layout/TopBar";
import RunStrip from "@/components/Layout/RunStrip";
import ToastContainer from "@/components/Shared/ToastContainer";
import ApprovalModal from "@/components/Shared/ApprovalModal";
import HomePage from "@/components/Pages/HomePage";
import SwarmPage from "@/components/Pages/SwarmPage";
import MissionsPage from "@/components/Pages/MissionsPage";
import MemoryPage from "@/components/Pages/MemoryPage";
import ToolsPage from "@/components/Pages/ToolsPage";
import ActivityPage from "@/components/Pages/ActivityPage";
import SettingsPage from "@/components/Pages/SettingsPage";
import { AnimatePresence, motion } from "framer-motion";

// OS / Voice integrations
import { VoiceOrb } from "./voice/VoiceOrb";
import type { OrbState } from "./os/BraceOrb";
import { ChatBubble, ChatInput } from "./components/Interface";
import { CommandPalette } from "./components/CommandPalette";
import { FirstRunExperience } from "./components/FirstRunExperience";
import { braceClient } from "./lib/braceClient";
import type { ChatMessage } from "./types";
import { useVoiceAgent } from "./voice/useVoiceAgent";

const PAGES: Record<string, React.ComponentType<any>> = {
  home: HomePage,
  swarm: SwarmPage,
  missions: MissionsPage,
  memory: MemoryPage,
  tools: ToolsPage,
  activity: ActivityPage,
  settings: SettingsPage,
};

export default function App() {
  const { currentPage } = useBraceStore();
  const PageComponent = PAGES[currentPage] || HomePage;

  // Voice & Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load startup chat history
    braceClient.listChat()
      .then((res: any) => {
        if (Array.isArray(res)) {
          setMessages(res);
        } else if (res && res.messages) {
          setMessages(res.messages);
        }
      })
      .catch((e) => console.warn("Failed to load chat history:", e));

    const fetchSys = () => {
      braceClient.systemInfo()
        .then(() => {
          // do nothing, removed systemInfo
        }).catch((e) => console.debug("System info access blocked:", e.message));

      braceClient.assistantStatus()
        .then(() => {
          // do nothing, removed assistantStatus
        })
        .catch((e) => console.debug("Assistant status request failed:", e.message));
    };
    fetchSys();
    const interval = setInterval(fetchSys, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      braceClient.saveChat(messages).catch(() => {});
    }
  }, [messages]);

  const handleCommand = async (text: string) => {
    setLoading(true);
    try {
      const result: any = await braceClient.assistantChat({ message: text });
      setLoading(false);
      if (result.success && result.message) {
        return typeof result.message === "string" ? result.message : result.message.text || result.message;
      } else {
        throw new Error(result.error || "Unknown response structure");
      }
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const addMessage = (message: ChatMessage) => setMessages((prev) => [...prev, message]);

  const voiceAgent = useVoiceAgent({
    sendCommand: handleCommand,
    addMessage,
    voiceOutputEnabled: true,
  });

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    
    try {
      const response = await handleCommand(text);
      setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", text: response, source: "agent" }]);
      voiceAgent.speakText(response, "assistant-response");
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", text: "System Failure: Could not connect to BRACE host engine.", source: "system" },
      ]);
    }
  };

  const activeOrbState: OrbState = 
    voiceAgent.orbState === "listening" ? "listening" :
    voiceAgent.orbState === "transcribing" ? "transcribing" :
    voiceAgent.orbState === "thinking" ? "thinking" :
    voiceAgent.orbState === "speaking" ? "speaking" :
    voiceAgent.orbState === "error" ? "error" :
    loading ? "thinking" : "idle";

  return (
    <div
      className="grid h-screen w-screen overflow-hidden text-slate-200 font-sans"
      style={{
        gridTemplateColumns: "64px 1fr",
        background: `
          radial-gradient(ellipse at top left, rgba(34,211,238,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at bottom right, rgba(245,158,11,0.03) 0%, transparent 50%),
          var(--bg-base)`,
      }}
    >
      <FirstRunExperience />
      <CommandPalette />
      
      {/* Left Navigation Rail */}
      <NavRail />

      {/* Main Content */}
      <div className="grid overflow-hidden relative" style={{ gridTemplateRows: "44px 1fr auto" }}>
        {/* Top Status Bar */}
        <TopBar />

        {/* Workspace */}
        <main className="overflow-hidden relative flex">
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                className="h-full"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PageComponent 
                  voiceAgent={voiceAgent} 
                  activeOrbState={activeOrbState}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating Global VoiceOrb */}
          <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <VoiceOrb 
              state={activeOrbState} 
              volumeLevel={voiceAgent.volumeLevel} 
              onClick={() => {
                setShowChat(true);
                voiceAgent.orbState === "listening" ? voiceAgent.stopListening() : voiceAgent.startListening();
              }} 
            />
          </div>

          {/* Chat Side Panel Slide-in */}
          <AnimatePresence>
            {showChat && (
              <motion.div 
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                className="absolute top-0 right-0 h-full w-[400px] z-40 bg-[var(--bg-panel)] border-l border-[var(--hairline)] flex flex-col shadow-2xl backdrop-blur-xl"
              >
                <div className="flex justify-between items-center p-4 border-b border-[var(--hairline)] bg-[var(--bg-elev-1)]">
                  <h2 className="text-sm font-semibold tracking-wider text-cyan-400">BRACE INTERLINK</h2>
                  <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="border-l-2 border-l-cyan-400 p-2 text-cyan-200 text-xs animate-pulse flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                        PROC.DATA...
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                <div className="p-4 bg-[var(--bg-elev-1)] border-t border-[var(--hairline)]">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    isProcessing={loading}
                    onVoice={() => voiceAgent.orbState === "listening" ? voiceAgent.stopListening() : voiceAgent.startListening()}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Bottom Run Strip */}
        <RunStrip />
      </div>

      {/* Overlays */}
      <ApprovalModal />
      <ToastContainer />
    </div>
  );
}
