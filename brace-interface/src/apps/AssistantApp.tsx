import { useState, useEffect, useRef } from "react";
import { braceClient } from "../lib/braceClient";
import { ChatBubble, ChatInput } from "../components/Interface";
import type { ChatMessage } from "../types";

export function AssistantApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    braceClient.listChat().then((res: any) => {
      if (Array.isArray(res)) {
        setMessages(res);
      } else if (res && res.messages) {
        setMessages(res.messages);
      }
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      braceClient.saveChat(messages).catch(() => {});
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    
    const userMsg: ChatMessage = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result: any = await braceClient.assistantChat({ prompt: text });
      if (result.success && result.message) {
        setMessages((prev) => [...prev, result.message]);
      } else {
        setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", text: "Error: " + (result.error || "Unknown"), source: "system" }]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", text: "Connection failed.", source: "system" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <p>Welcome to B.R.A.C.E Assistant.</p>
            <p className="text-sm mt-2">How can I help you today?</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3 text-white/70 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t border-white/10 bg-black/40">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isProcessing={loading}
          onVoice={() => {}}
        />
      </div>
    </div>
  );
}
