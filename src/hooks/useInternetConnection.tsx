import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export const useInternetConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isConnected; // null (loading), true (online), false (offline)
};
