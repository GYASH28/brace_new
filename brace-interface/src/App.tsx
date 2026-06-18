import { useState, useEffect, useRef } from "react";
import { TopBar } from "./components/Interface";
import { VoiceOrb } from "./voice/VoiceOrb";
import type { OrbState } from "./os/BraceOrb";
import { CodingWorkspace, ResearchWorkspace, ClientWorkspace, IntegrationWorkspace } from "./os/workspaces";
import { OsWorkspace } from "./os/OsWorkspace";
import type { WorkspaceType } from "./os/WorkspaceLayout";
import { ExecutiveBriefing } from "./os/ExecutiveBriefing";
import { ChatBubble, ChatInput } from "./components/Interface";
import { CommandPalette } from "./components/CommandPalette";
import { FirstRunExperience } from "./components/FirstRunExperience";
import { braceClient } from "./lib/braceClient";
import type { ChatMessage, SystemInfo } from "./types";
import { useVoiceAgent } from "./voice/useVoiceAgent";

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceType>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [assistantStatus, setAssistantStatus] = useState<any | null>(null);

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

    // Periodically load system diagnostics
    const fetchSys = () => {
      braceClient.systemInfo()
        .then((res: any) => {
          if (res.ok && res.info) setSystemInfo(res.info);
        })
        .catch((e) => console.debug("System info access blocked:", e.message));

      braceClient.assistantStatus()
        .then((res: any) => {
          if (res) setAssistantStatus(res);
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

  // Integrate Voice Agent for real STT/TTS pipeline and streaming state management
  const handleCommand = async (text: string) => {
    // Automatically morph workspaces depending on query content
    if (text.startsWith("/code") || text.toLowerCase().includes("code") || text.toLowerCase().includes("repo")) {
      setWorkspace("coding");
    } else if (text.startsWith("/research") || text.toLowerCase().includes("research") || text.toLowerCase().includes("web")) {
      setWorkspace("research");
    } else if (text.startsWith("/client") || text.toLowerCase().includes("client") || text.toLowerCase().includes("invoice")) {
      setWorkspace("client");
    } else if (text.startsWith("/integration") || text.toLowerCase().includes("integration") || text.toLowerCase().includes("n8n")) {
      setWorkspace("integration");
    } else if (text.startsWith("/os") || text.startsWith("/agents") || text.toLowerCase().includes("telemetry") || text.toLowerCase().includes("system dashboard")) {
      setWorkspace("os");
    }

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

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

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
      // Stream output state to Voice Orb
      voiceAgent.speakText(response, "assistant-response");
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", text: "System Failure: Could not connect to BRACE host engine.", source: "system" },
      ]);
    }
  };

  // Sync VoiceAgent state to Orb State
  const activeOrbState: OrbState = 
    voiceAgent.orbState === "listening" ? "listening" :
    voiceAgent.orbState === "thinking" ? "thinking" :
    voiceAgent.orbState === "speaking" ? "speaking" :
    voiceAgent.orbState === "error" ? "error" :
    loading ? "thinking" : "idle";

  // Build JSX for panels inside workspace
  const chatPanel = (
    <div className="flex flex-col h-full hud-panel-strong border-cyan-400/20 overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="hud-panel border-l-2 border-l-cyan-400 p-4 text-cyan-200 text-sm animate-pulse flex items-center gap-3 font-mono">
              <div className="w-2 h-2 bg-cyan-400"></div>
              PROC.DATA...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      
      {/* Search Input bar sticky at bottom of chat */}
      <div className="p-4 bg-black/20 border-t border-white/5 backdrop-blur-lg">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isProcessing={loading}
          onVoice={() => voiceAgent.orbState === "listening" ? voiceAgent.stopListening() : voiceAgent.startListening()}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-200 font-mono">
      <FirstRunExperience />
      <CommandPalette />
      <div className="flex flex-1 flex-col relative z-10 w-full">
        <TopBar
          assistantStatus={assistantStatus}
          hasGeminiKey={true}
          micActive={activeOrbState === "listening" || activeOrbState === "transcribing"}
          systemInfo={systemInfo}
          runtimeLabel={`B.R.A.C.E SYS // ${workspace.toUpperCase()}`}
        />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col items-center justify-between min-h-[calc(100vh-64px)] pb-12">
        {workspace === "general" ? (
          <>
            {/* Top time-aware greeting */}
            <div className="text-center mt-10">
              <h1 className="text-4xl font-display font-light tracking-wide text-white drop-shadow-xl">
                Good evening, <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400">Yash</span>.
              </h1>
              <p className="text-xs text-cyan-400 mt-3 uppercase tracking-[0.3em] font-mono font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                SYSTEM ONLINE • JARVIS SECURE NODE
              </p>
            </div>

            {/* Central Assistant Presence: The Orb */}
            <div className="my-10 flex items-center justify-center">
              <VoiceOrb 
                state={activeOrbState} 
                volumeLevel={voiceAgent.volumeLevel} 
                onClick={() => voiceAgent.orbState === "listening" ? voiceAgent.stopListening() : voiceAgent.startListening()} 
              />
            </div>

            {/* Briefing Panel */}
            <div className="w-full flex justify-center mb-10 z-10">
              <ExecutiveBriefing />
            </div>

            {/* Global Search / Command Bar */}
            <div className="w-full max-w-2xl hud-panel-strong rounded-none border-x-4 border-x-cyan-400 p-2 backdrop-blur-2xl transition-all duration-300 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                isProcessing={loading}
                onVoice={() => voiceAgent.orbState === "listening" ? voiceAgent.stopListening() : voiceAgent.startListening()}
              />
            </div>
          </>
        ) : workspace === "coding" ? (
          <CodingWorkspace chatPanel={chatPanel} onClose={() => setWorkspace("general")} />
        ) : workspace === "research" ? (
          <ResearchWorkspace chatPanel={chatPanel} onClose={() => setWorkspace("general")} />
        ) : workspace === "client" ? (
          <ClientWorkspace chatPanel={chatPanel} onClose={() => setWorkspace("general")} />
        ) : workspace === "integration" ? (
          <IntegrationWorkspace chatPanel={chatPanel} onClose={() => setWorkspace("general")} />
        ) : workspace === "os" ? (
          <OsWorkspace chatPanel={chatPanel} onClose={() => setWorkspace("general")} />
        ) : null}
      </main>
      </div>
    </div>
  );
}
