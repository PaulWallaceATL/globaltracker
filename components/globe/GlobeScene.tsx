"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { latLngToCameraPosition } from "@/lib/geo/coords";
import { buildOpsMapCanvas } from "@/lib/geo/ops-map-texture";
import { useTrackerStore } from "@/store/tracker-store";
import { GeoLayers } from "./GeoLayers";
import { LabelProjector } from "./LabelProjector";
import { Markers } from "./Markers";
import { PopulationHeat } from "./PopulationHeat";
import { mergeDegForZoom } from "@/lib/geo/cluster";

export function GlobeScene() {
  const [canvasKey, setCanvasKey] = useState(0);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCreated = useCallback(
    ({ gl }: { gl: THREE.WebGLRenderer }) => {
      gl.setClearColor("#070b12", 1);
      gl.outputColorSpace = THREE.SRGBColorSpace;

      const canvas = gl.domElement;
      const onLost = (e: Event) => {
        e.preventDefault();
        if (recoverTimer.current) clearTimeout(recoverTimer.current);
        recoverTimer.current = setTimeout(() => {
          setCanvasKey((k) => k + 1);
        }, 250);
      };
      canvas.addEventListener("webglcontextlost", onLost, false);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (recoverTimer.current) clearTimeout(recoverTimer.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#070b12]">
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 0.15, 3.35], fov: 42, near: 0.02, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={onCreated}
      >
        <color attach="background" args={["#070b12"]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[5, 3, 5]} intensity={0.55} />
        <Suspense fallback={<PlainEarth />}>
          <OpsEarth />
        </Suspense>
        <GeoLayers />
        <PopulationHeat />
        <MarkerLayer />
        <LabelProjector />
        <CameraFlyer />
        <GlobeControls />
        <ZoomClusterSync />
      </Canvas>
    </div>
  );
}

function GlobeControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dist = camera.position.length();
    // Aggressive scroll dolly at all ranges (still a bit softer when close-in)
    const t = Math.max(0, Math.min(1, (dist - 1.12) / (5.8 - 1.12)));
    controls.zoomSpeed = 0.85 + t * 1.15;
    controls.rotateSpeed = 0.22 + t * 0.18;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      minDistance={1.12}
      maxDistance={5.8}
      rotateSpeed={0.32}
      zoomSpeed={1.4}
      enableDamping
      dampingFactor={0.09}
      autoRotate={false}
      // One-finger rotate, two-finger pinch zoom (mobile)
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      }}
    />
  );
}

function PlainEarth() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial color="#0b121c" />
    </mesh>
  );
}

/** Hard-edged political ops map — stays sharp when zoomed; no satellite blur. */
function OpsEarth() {
  const { gl } = useThree();
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tex: THREE.CanvasTexture | null = null;

    void (async () => {
      try {
        const res = await fetch("/geo/countries.geojson");
        if (!res.ok) throw new Error(`geojson ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const canvas = buildOpsMapCanvas(data, 8192, 4096);
        tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        if (!cancelled) setTexture(tex);
      } catch (err) {
        console.warn("[globaltracker] Ops map texture failed", err);
      }
    })();

    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [gl]);

  if (!texture) return <PlainEarth />;

  return (
    <mesh>
      <sphereGeometry args={[1, 192, 192]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function MarkerLayer() {
  const events = useTrackerStore((s) => s.events);
  const layers = useTrackerStore((s) => s.layers);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const selectEvent = useTrackerStore((s) => s.selectEvent);
  const setHoveredEvent = useTrackerStore((s) => s.setHoveredEvent);
  const memoEvents = useMemo(() => events, [events]);

  return (
    <Markers
      events={memoEvents}
      layers={layers}
      selectedId={selectedEvent?.id ?? null}
      onSelect={selectEvent}
      onHover={setHoveredEvent}
    />
  );
}

function CameraFlyer() {
  const focusTarget = useTrackerStore((s) => s.focusTarget);
  const flyToken = useTrackerStore((s) => s.flyToken);
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const anim = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const z = Math.min(3.2, Math.max(0.55, focusTarget.zoom ?? 1));
    const distance = Math.max(1.14, Math.min(5.5, 3.35 / z));
    const to = latLngToCameraPosition(
      focusTarget.lat,
      focusTarget.lng,
      distance,
    );
    anim.current = {
      from: camera.position.clone(),
      to,
      t: 0,
      active: true,
    };
  }, [flyToken, focusTarget, camera]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a?.active) return;
    a.t = Math.min(1, a.t + delta * 0.45);
    const eased = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.from, a.to, eased);
    camera.lookAt(0, 0, 0);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
    if (a.t >= 1) a.active = false;
  });

  return null;
}

/** Keep clustering + LOD adaptive to camera distance. */
function ZoomClusterSync() {
  const setClusterMergeDeg = useTrackerStore((s) => s.setClusterMergeDeg);
  const setCameraZoom = useTrackerStore((s) => s.setCameraZoom);
  const { camera } = useThree();
  const lastZoom = useRef(0);

  useFrame(() => {
    const dist = camera.position.length();
    const zoom = Math.max(0.45, Math.min(4.2, 4.35 / dist));
    if (Math.abs(zoom - lastZoom.current) < 0.04) return;
    lastZoom.current = zoom;
    setCameraZoom(zoom);
    setClusterMergeDeg(mergeDegForZoom(zoom));
  });

  return null;
}
