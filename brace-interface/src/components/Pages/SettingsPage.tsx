import { useState } from "react";
import { Settings, ToggleLeft, ToggleRight } from "lucide-react";

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    legacy_local: true,
    prog_disc: true,
    curator: true,
    approval_fsread: true,
    approval_fswrite: false,
    approval_terminal: false,
  });

  const toggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
        <Settings size={16} strokeWidth={2} />
        Settings
      </h2>
      <p className="text-[11.5px] mb-4" style={{ color: "var(--text-muted)" }}>
        B.R.A.C.E Agent OS — local-first configuration. All values stored in SQLite Hive Mind.
      </p>

      {/* AI Provider */}
      <SettingsSection title="AI Provider">
        <SettingRow label="Primary router" description="Fast, cheap model used for intent classification + task dispatch" value="gemini-2.5-flash" />
        <SettingRow label="Code & reasoning" description="Frontier model used by Builder, Reviewer, QA Sentinel" value="claude-3.5-sonnet" />
        <SettingRow label="Creative" description="High-temperature model for Creative Studio agent" value="gemini-2.5-pro" />
        <SettingRowToggle
          label="Local fallback"
          description="Used when no API key configured"
          enabled={toggles.legacy_local}
          onToggle={() => toggle("legacy_local")}
        />
      </SettingsSection>

      {/* Memory */}
      <SettingsSection title="Memory">
        <SettingRow label="Vault location" description="Plain markdown knowledge layer" value="./workspace/.os/" />
        <SettingRow label="SQLite Hive Mind" description="State store, message bus, telemetry" value="./db/hivemind.db" />
        <SettingRowToggle
          label="Progressive disclosure"
          description="Load only SOUL.md + skill summaries initially"
          enabled={toggles.prog_disc}
          onToggle={() => toggle("prog_disc")}
        />
        <SettingRowToggle
          label="Auto-curation"
          description="Curator agent extracts skills every 15 min"
          enabled={toggles.curator}
          onToggle={() => toggle("curator")}
        />
      </SettingsSection>

      {/* Permissions & Approval Gates */}
      <SettingsSection title="Permissions & Approval Gates">
        <SettingRow label="Read-only tools" description="fs_read, web_search, url_fetch, memory_search" value="auto-approve" valueColor="var(--accent-emerald)" />
        <SettingRowToggle
          label="Medium-risk write"
          description="fs_write, memory_append"
          enabled={toggles.approval_fswrite}
          onToggle={() => toggle("approval_fswrite")}
        />
        <SettingRowToggle
          label="High-risk execution"
          description="terminal_execute, system commands"
          enabled={toggles.approval_terminal}
          onToggle={() => toggle("approval_terminal")}
        />
      </SettingsSection>

      {/* Data Paths */}
      <SettingsSection title="Data Paths">
        <SettingRow label="BRACE_HOME" description="Root directory for all OS data" value="~/.brace-os/" />
        <SettingRow label="Checkpoints" description="Agent run checkpoints for resume" value="~/.brace-os/checkpoints/" />
        <SettingRow label="Logs" description="Structured application logs" value="~/.brace-os/logs/" />
        <SettingRow label="Backups" description="Automatic pre-migration backups" value="~/.brace-os/backups/" />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="mb-3.5"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--r-lg)",
        padding: "16px 18px",
      }}
    >
      <h3
        className="text-[11px] uppercase tracking-widest mb-2.5 pb-2"
        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--hairline)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  valueColor,
}: {
  label: string;
  description: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <div>
        <div className="text-xs" style={{ color: "var(--text-primary)" }}>
          {label}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      </div>
      <span
        className="text-[11px] flex items-center gap-1.5"
        style={{ fontFamily: "var(--font-mono)", color: valueColor || "var(--accent-cyan)" }}
      >
        {value}
      </span>
    </div>
  );
}

function SettingRowToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <div>
        <div className="text-xs" style={{ color: "var(--text-primary)" }}>
          {label}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      </div>
      <button onClick={onToggle} className="transition-all">
        {enabled ? (
          <ToggleRight size={36} strokeWidth={1.5} style={{ color: "var(--accent-cyan)" }} />
        ) : (
          <ToggleLeft size={36} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
        )}
      </button>
    </div>
  );
}
