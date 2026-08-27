import { networkInterfaces } from "os";
export const getLocalNetworkAddress = () => {
  const interfaces = networkInterfaces();
  let localNetworkAddress: string | undefined;

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      // Only IPv4 addresses reachable by another device are useful here.
      if (iface.internal || iface.family !== "IPv4") {
        continue;
      }

      localNetworkAddress = iface.address;
    }
  }

  return localNetworkAddress;
};
