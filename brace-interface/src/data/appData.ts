import { Bot, BrainCircuit, FileText, Gauge, Home, KeyRound, ListFilter, MemoryStick, Mic, NotebookText, PackageSearch, Rocket, Settings, TerminalSquare, Workflow } from "lucide-react";
import type { NavItem } from "../types";

export const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: Bot },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "agent", label: "Agent", icon: BrainCircuit },
  { id: "tasks", label: "Tasks", icon: Workflow },
  { id: "files", label: "Files", icon: FileText },
  { id: "memory", label: "Memory", icon: MemoryStick },
  { id: "notes", label: "Notes", icon: NotebookText },
  { id: "tools", label: "Tools", icon: PackageSearch },
  { id: "projects", label: "Projects", icon: TerminalSquare },
  { id: "system", label: "System", icon: Gauge },
  { id: "apps", label: "Apps", icon: Rocket },
  { id: "permissions", label: "Access", icon: KeyRound },
  { id: "logs", label: "Logs", icon: ListFilter },
  { id: "settings", label: "Settings", icon: Settings },
];


