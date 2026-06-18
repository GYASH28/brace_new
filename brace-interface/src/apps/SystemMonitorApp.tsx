import { useState, useEffect } from "react";
import { Activity, Cpu, Server } from "lucide-react";
import { braceClient } from "../lib/braceClient";

export function SystemMonitorApp() {
  const [sysInfo, setSysInfo] = useState<any>(null);

  useEffect(() => {
    const fetchInfo = () => {
      braceClient.systemInfo().then((res: any) => {
        if (res.ok && res.info) setSysInfo(res.info);
      });
    };
    
    fetchInfo();
    const timer = setInterval(fetchInfo, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 bg-gray-900/80 h-full text-white overflow-y-auto">
      <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
        <Activity className="text-green-400" />
        System Monitor
      </h2>
      
      {!sysInfo ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 border border-white/10 rounded-lg p-4 flex items-start gap-4">
            <Cpu className="text-cyan-400 mt-1" />
            <div>
              <div className="text-sm text-white/60 mb-1">CPU Usage</div>
              <div className="text-2xl font-bold">{Math.round(sysInfo.cpuUsage || 0)}%</div>
            </div>
          </div>
          
          <div className="bg-black/40 border border-white/10 rounded-lg p-4 flex items-start gap-4">
            <Server className="text-violet-400 mt-1" />
            <div>
              <div className="text-sm text-white/60 mb-1">Memory Usage</div>
              <div className="text-2xl font-bold">
                {Math.round((sysInfo.totalMem - sysInfo.freeMem) / 1024 / 1024 / 1024)} GB
              </div>
              <div className="text-xs text-white/40 mt-1">
                of {Math.round(sysInfo.totalMem / 1024 / 1024 / 1024)} GB
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
