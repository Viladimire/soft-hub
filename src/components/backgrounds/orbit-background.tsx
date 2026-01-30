"use client";

import { Canvas } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

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

const Orbs = ({ count = 36 }: { count?: number }) => {
  const group = useRef<THREE.Group | null>(null);

  const positions = useMemo(
    () =>
      Array.from({ length: count }, () => [
        (Math.random() - 0.5) * 46,
        (Math.random() - 0.5) * 34,
        (Math.random() - 0.5) * 40,
      ] as const),
    [count],
  );

  const speeds = useMemo(
    () => Array.from({ length: count }, () => Math.random() * 0.0012 + 0.00035),
    [count],
  );

  const radii = useMemo(
    () => Array.from({ length: count }, () => Math.random() * 10 + 12),
    [count],
  );

  // Local lightweight animation loop to avoid extra dependencies.
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      raf = window.requestAnimationFrame(tick);
      if (!group.current) return;

      group.current.rotation.y += 0.0005;
      group.current.rotation.x += 0.00025;

      const now = Date.now() * 0.001;
      group.current.children.forEach((child, index) => {
        child.position.x = Math.cos(now + index) * radii[index];
        child.position.z = Math.sin(now + index) * radii[index];
        child.rotation.y += speeds[index];
      });
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [radii, speeds]);

  return (
    <group ref={group}>
      {positions.map((pos, index) => (
        <Sphere key={index} args={[0.7, 32, 32]} position={pos}>
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

  if (!enabled || reducedMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 48], fov: 75 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1} />
        <Orbs />
      </Canvas>
    </div>
  );
};
