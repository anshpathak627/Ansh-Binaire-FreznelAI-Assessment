import { useEffect, useState } from "react";
import { connectivityMonitor } from "../lib/ConnectivityMonitor";

/** Thin React hook wrapping the ConnectivityMonitor singleton class. */
export function useConnectivity(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(connectivityMonitor.getStatus());

  useEffect(() => {
    return connectivityMonitor.subscribe(setIsOnline);
  }, []);

  return { isOnline };
}
