import { Flex, View, Text } from "@adobe/react-spectrum";
import { useEffect, useRef, useState } from "react";
import { useConnectivity } from "../hooks/useConnectivity";

export default function ConnectionBanner() {
  const { isOnline } = useConnectivity();
  const [animKey, setAnimKey] = useState(0);
  const prevOnline = useRef(isOnline);

  useEffect(() => {
    if (prevOnline.current !== isOnline) {
      prevOnline.current = isOnline;
      setAnimKey((k) => k + 1);
    }
  }, [isOnline]);

  return (
    <View
      key={animKey}
      UNSAFE_className="connection-banner banner-slide"
      borderRadius="large"
      paddingX="size-150"
      paddingY="size-75"
    >
      <Flex alignItems="center" gap="size-100">
        <span className={`status-dot ${isOnline ? "online" : "offline"}`} aria-hidden="true" />
        <Text>{isOnline ? "Online" : "Offline — showing cached data"}</Text>
      </Flex>
    </View>
  );
}
