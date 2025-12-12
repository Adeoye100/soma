import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface GearProps {
  position: [number, number, number];
  rotation: number;
  color: string;
  size: number;
  teeth: number;
  speed: number;
}

const Gear: React.FC<GearProps> = ({ position, rotation, color, size, teeth, speed }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * speed;
    }
  });

  // Create gear geometry
  const gearGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = size;
    const innerRadius = size * 0.7;

    // Create outer circle
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

    // Create teeth
    const teethShape = new THREE.Path();
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const nextAngle = ((i + 1) / teeth) * Math.PI * 2;

      teethShape.moveTo(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius
      );
      teethShape.lineTo(
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius
      );
      teethShape.lineTo(
        Math.cos(nextAngle) * outerRadius,
        Math.sin(nextAngle) * outerRadius
      );
      teethShape.lineTo(
        Math.cos(nextAngle) * innerRadius,
        Math.sin(nextAngle) * innerRadius
      );
    }

    shape.holes.push(teethShape);

    // Create center hole
    const hole = new THREE.Path();
    hole.absarc(0, 0, size * 0.3, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    return new THREE.ShapeGeometry(shape);
  }, [size, teeth]);

  return (
    <mesh ref={meshRef} position={position} geometry={gearGeometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

interface GearAnimationProps {
  isActive?: boolean;
  size?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
}

const GearAnimation: React.FC<GearAnimationProps> = ({
  isActive = true,
  size = 2,
  color = "#3b82f6",
  showLabel = false,
  label = "Analysis"
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {isActive && (
          <>
            <Gear
              position={[-2, 0, 0]}
              rotation={0}
              color={color}
              size={size * 0.8}
              teeth={12}
              speed={1}
            />
            <Gear
              position={[2, 0, 0]}
              rotation={0}
              color={color}
              size={size * 0.6}
              teeth={10}
              speed={-1.5}
            />
            <Gear
              position={[0, 2.5, 0]}
              rotation={0}
              color={color}
              size={size * 0.5}
              teeth={8}
              speed={2}
            />
            <Gear
              position={[0, -2.5, 0]}
              rotation={0}
              color={color}
              size={size * 0.4}
              teeth={6}
              speed={-2.5}
            />
          </>
        )}

        {showLabel && (
          <Text
            position={[0, -4, 0]}
            fontSize={0.5}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        )}

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={isActive}
          autoRotateSpeed={2}
        />
      </Canvas>
    </div>
  );
};

export default GearAnimation;
