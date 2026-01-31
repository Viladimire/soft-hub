"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

let hasMountedStore = false;
const hasMountedListeners = new Set<() => void>();

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(media.matches));

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduced;
};

const useLowPowerMode = () => {
  const [lowPower] = useState(() => {
    if (typeof window === "undefined") return false;

    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
      deviceMemory?: number;
    };

    const saveData = Boolean(nav.connection?.saveData);
    const effectiveType = String(nav.connection?.effectiveType ?? "");
    const slowNet = effectiveType.includes("2g") || effectiveType.includes("slow-2g");

    const deviceMemory = Number(nav.deviceMemory ?? 0);
    const cores = Number(navigator.hardwareConcurrency ?? 0);

    return saveData || slowNet || (deviceMemory > 0 && deviceMemory < 4) || (cores > 0 && cores < 4);
  });

  return lowPower;
};

const useHasMounted = () => {
  const mounted = useSyncExternalStore(
    (onStoreChange) => {
      hasMountedListeners.add(onStoreChange);
      return () => {
        hasMountedListeners.delete(onStoreChange);
      };
    },
    () => hasMountedStore,
    () => false,
  );

  useEffect(() => {
    if (hasMountedStore) return;
    hasMountedStore = true;
    hasMountedListeners.forEach((listener) => listener());
  }, []);

  return mounted;
};

const Orbs = ({ count = 16 }: { count?: number }) => {
  const group = useRef<THREE.Group | null>(null);

  const rng = useMemo(() => mulberry32(1337 + count * 97), [count]);

  const positions = useMemo(
    () =>
      Array.from({ length: count }, () => [
        (rng() - 0.5) * 46,
        (rng() - 0.5) * 34,
        (rng() - 0.5) * 40,
      ] as const),
    [count, rng],
  );

  const speeds = useMemo(
    () => Array.from({ length: count }, () => rng() * 0.0012 + 0.00035),
    [count, rng],
  );

  const radii = useMemo(
    () => Array.from({ length: count }, () => rng() * 10 + 12),
    [count, rng],
  );

  useFrame((state) => {
    if (!group.current) return;

    group.current.rotation.y += 0.0005;
    group.current.rotation.x += 0.00025;

    const now = state.clock.elapsedTime;
    group.current.children.forEach((child, index) => {
      child.position.x = Math.cos(now + index) * radii[index];
      child.position.z = Math.sin(now + index) * radii[index];
      child.rotation.y += speeds[index];
    });
  });

  return (
    <group ref={group}>
      {positions.map((pos, index) => (
        <Sphere key={index} args={[0.65, 16, 16]} position={pos}>
          <meshStandardMaterial
            color="#8aa9ff"
            emissive="#3f5cff"
            emissiveIntensity={0.55}
            roughness={0.35}
          />
        </Sphere>
      ))}
    </group>
  );
};

export const OrbitBackground = ({ enabled = true }: { enabled?: boolean }) => {
  const reducedMotion = usePrefersReducedMotion();
  const lowPower = useLowPowerMode();
  const mounted = useHasMounted();

  if (!enabled || !mounted || reducedMotion || lowPower) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 48], fov: 75 }}
        dpr={1}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      >
        <ambientLight intensity={1} />
        <Orbs />
      </Canvas>
    </div>
  );
};
