import { useState, useEffect } from "react";
import { Folder, HardDrive } from "lucide-react";
import { braceClient } from "../lib/braceClient";

export function ExplorerApp() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    braceClient.listProjects().then((res: any) => {
      if (Array.isArray(res)) setItems(res);
      else if (res && res.projects) setItems(res.projects);
    });
  }, []);

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-48 bg-black/40 border-r border-white/10 p-2 flex flex-col gap-1">
        <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 text-left text-sm">
          <HardDrive size={16} className="text-gray-400" />
          <span>Local Disk</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 text-left text-sm">
          <Folder size={16} className="text-cyan-400" />
          <span>B.R.A.C.E Brain</span>
        </button>
      </div>
      
      {/* Main View */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
          <Folder size={20} className="text-cyan-400" />
          B.R.A.C.E Brain
        </h2>
        
        {items.length === 0 ? (
          <div className="text-white/50 text-sm">No items found.</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors">
                <Folder size={32} className="text-yellow-400" />
                <span className="text-xs text-center truncate w-full">{item.name || "Folder"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
