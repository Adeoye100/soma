import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// Globe dots configuration
const DOT_COUNT = 2000;
const GLOBE_RADIUS = 2;

// Generate Fibonacci sphere points
function generateFibonacciSpherePoints(count: number, radius: number): Float32Array {
  const points = new Float32Array(count * 3);
  const phi = Math.PI * (3 - Math.sqrt(5));
  
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    
    points[i * 3] = x * radius;
    points[i * 3 + 1] = y * radius;
    points[i * 3 + 2] = z * radius;
  }
  
  return points;
}

// Active user locations (approximate coordinates for demo)
const activeLocations = [
  { lat: 9.082, lon: 8.6753, intensity: 1.0 }, // Nigeria
  { lat: -0.0236, lon: 37.9062, intensity: 0.8 }, // Kenya
  { lat: 7.9465, lon: -1.0232, intensity: 0.7 }, // Ghana
  { lat: -30.5595, lon: 22.9375, intensity: 0.6 }, // South Africa
  { lat: 1.3733, lon: 32.2903, intensity: 0.5 }, // Uganda
  { lat: -6.369, lon: 34.8888, intensity: 0.4 }, // Tanzania
  { lat: -13.1339, lon: 27.8493, intensity: 0.3 }, // Zambia
  { lat: 55.3781, lon: -3.436, intensity: 0.2 }, // UK
  { lat: 37.0902, lon: -95.7129, intensity: 0.15 }, // USA
];

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

function GlobePoints({ hovered }: { hovered: boolean }) {
  const meshRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => generateFibonacciSpherePoints(DOT_COUNT, GLOBE_RADIUS), []);
  
  const colors = useMemo(() => {
    const colorArray = new Float32Array(DOT_COUNT * 3);
    const baseColor = new THREE.Color('#6C63FF');
    
    for (let i = 0; i < DOT_COUNT; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Check if this point is near an active location
      let intensity = 0.3;
      const pointVec = new THREE.Vector3(x, y, z);
      
      activeLocations.forEach(loc => {
        const locVec = latLonToVector3(loc.lat, loc.lon, GLOBE_RADIUS);
        const distance = pointVec.distanceTo(locVec);
        if (distance < 0.3) {
          intensity = Math.max(intensity, loc.intensity);
        }
      });
      
      colorArray[i * 3] = baseColor.r * intensity;
      colorArray[i * 3 + 1] = baseColor.g * intensity;
      colorArray[i * 3 + 2] = baseColor.b * intensity;
    }
    
    return colorArray;
  }, [positions]);
  
  useFrame(() => {
    if (meshRef.current && !hovered) {
      meshRef.current.rotation.y += 0.001;
    }
  });
  
  const positionAttr = useMemo(() => {
    const attr = new THREE.BufferAttribute(positions, 3);
    return attr;
  }, [positions]);
  
  const colorAttr = useMemo(() => {
    const attr = new THREE.BufferAttribute(colors, 3);
    return attr;
  }, [colors]);
  
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <primitive attach="attributes-position" object={positionAttr} />
        <primitive attach="attributes-color" object={colorAttr} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function ActivePings() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.3;
        mesh.scale.setScalar(scale);
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.3;
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {activeLocations.map((loc, i) => {
        const position = latLonToVector3(loc.lat, loc.lon, GLOBE_RADIUS + 0.05);
        return (
          <mesh key={i} position={position}>
            <sphereGeometry args={[0.08 * loc.intensity, 16, 16]} />
            <meshBasicMaterial 
              color={loc.intensity > 0.5 ? '#22C55E' : '#F59E0B'}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ConnectionArcs() {
  const groupRef = useRef<THREE.Group>(null);
  
  const arcs = useMemo(() => {
    const arcData: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    
    // Create arcs between high-traffic locations
    const mainLocations = activeLocations.slice(0, 4);
    
    for (let i = 0; i < mainLocations.length; i++) {
      for (let j = i + 1; j < mainLocations.length; j++) {
        arcData.push({
          start: latLonToVector3(mainLocations[i].lat, mainLocations[i].lon, GLOBE_RADIUS + 0.02),
          end: latLonToVector3(mainLocations[j].lat, mainLocations[j].lon, GLOBE_RADIUS + 0.02),
        });
      }
    }
    
    return arcData;
  }, []);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const line = child as THREE.Line;
        const material = line.material as THREE.LineBasicMaterial;
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime + i) * 0.2;
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {arcs.map((arc, i) => {
        const midPoint = arc.start.clone().add(arc.end).multiplyScalar(0.5);
        midPoint.normalize().multiplyScalar(GLOBE_RADIUS * 1.3);
        
        const curve = new THREE.QuadraticBezierCurve3(arc.start, midPoint, arc.end);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        return (
          <primitive key={i} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#6C63FF', transparent: true, opacity: 0.3 }))} />
        );
      })}
    </group>
  );
}

function GlobeScene() {
  const [hovered, setHovered] = useState(false);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <group 
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <GlobePoints hovered={hovered} />
        <ActivePings />
        <ConnectionArcs />
      </group>
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        autoRotate={!hovered}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function DotMatrixGlobe() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-[500px] bg-gradient-to-b from-transparent to-primary/5 rounded-2xl overflow-hidden"
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <GlobeScene />
      </Canvas>
    </motion.div>
  );
}
