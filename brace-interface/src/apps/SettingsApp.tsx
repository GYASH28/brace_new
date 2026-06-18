import { useState, useEffect } from "react";
import { braceClient } from "../lib/braceClient";
import type { SettingsState } from "../types";

export function SettingsApp() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  
  useEffect(() => {
    braceClient.state().then((res: any) => {
      if (res && res.settings) {
        setSettings(res.settings);
      }
    });
  }, []);

  if (!settings) return <div className="p-8 text-white/50">Loading settings...</div>;

  return (
    <div className="p-6 text-white h-full overflow-y-auto bg-gray-900/50">
      <h2 className="text-2xl font-semibold mb-6">System Settings</h2>
      
      <div className="space-y-6">
        <div className="bg-black/30 border border-white/10 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">AI Provider</h3>
          <select 
            value={settings.aiProvider} 
            onChange={(e) => {
               // mock update
               setSettings({...settings, aiProvider: e.target.value as any});
               braceClient.updateSettings({ aiProvider: e.target.value });
            }}
            className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white"
          >
            <option value="gemini">Gemini API</option>
            <option value="nvidia">NVIDIA NIM (Llama 3)</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Local Ollama</option>
          </select>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Voice Settings</h3>
          <div className="flex items-center justify-between">
            <span>Voice Output</span>
            <input 
              type="checkbox" 
              checked={settings.voiceOutput} 
              onChange={(e) => {
                 setSettings({...settings, voiceOutput: e.target.checked});
                 braceClient.updateSettings({ voiceOutput: e.target.checked });
              }}
              className="w-5 h-5 rounded accent-cyan-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
