import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { cn } from '@/lib/utils';
import type { FloorPlan, Zone, GeneratedLayout } from '@shared/schema';

interface FloorPlan3DViewerProps {
  floorPlan: FloorPlan;
  zones: Zone[];
  layout?: GeneratedLayout;
  className?: string;
  onIlotClick?: (ilotId: string) => void;
}

export function FloorPlan3DViewer({ 
  floorPlan, 
  zones, 
  layout,
  className,
  onIlotClick 
}: FloorPlan3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [selectedIlot, setSelectedIlot] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(floorPlan.width / 2, 50, floorPlan.height * 1.5);
    camera.lookAt(floorPlan.width / 2, 0, floorPlan.height / 2);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(floorPlan.width, floorPlan.height);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Draw zones
    drawZones3D(scene, zones);

    // Draw layout if available
    if (layout) {
      drawLayout3D(scene, layout);
    }

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Handle mouse clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !camera) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.ilotId) {
          setSelectedIlot(object.userData.ilotId);
          onIlotClick?.(object.userData.ilotId);
        }
      }
    };
    containerRef.current.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('click', handleClick);
      renderer.dispose();
      controls.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [floorPlan, zones, layout, onIlotClick]);

  const drawZones3D = (scene: THREE.Scene, zones: Zone[]) => {
    zones.forEach(zone => {
      const coordinates = zone.coordinates as { x: number; y: number }[];
      if (!coordinates || coordinates.length < 2) return;

      switch (zone.type) {
        case 'wall':
          drawWalls3D(scene, coordinates, zone.color);
          break;
        case 'restricted':
        case 'entrance':
        case 'exit':
          drawZoneArea3D(scene, coordinates, zone.color, zone.type);
          break;
      }
    });
  };

  const drawWalls3D = (scene: THREE.Scene, coordinates: { x: number; y: number }[], color: string) => {
    const wallHeight = 3;
    const wallThickness = 0.2;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];
      
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
      );
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      
      const wallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(color || '#333333'),
        roughness: 0.8,
        metalness: 0.1
      });
      
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(
        (start.x + end.x) / 2,
        wallHeight / 2,
        (start.y + end.y) / 2
      );
      wall.rotation.y = -angle;
      wall.castShadow = true;
      wall.receiveShadow = true;
      
      scene.add(wall);
    }
  };

  const drawZoneArea3D = (
    scene: THREE.Scene, 
    coordinates: { x: number; y: number }[], 
    color: string,
    type: string
  ) => {
    if (coordinates.length < 3) return;

    const shape = new THREE.Shape();
    shape.moveTo(coordinates[0].x, coordinates[0].y);
    
    for (let i = 1; i < coordinates.length; i++) {
      shape.lineTo(coordinates[i].x, coordinates[i].y);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01; // Slightly above floor
    
    scene.add(mesh);

    // Add border
    const borderGeometry = new THREE.BufferGeometry().setFromPoints(
      coordinates.map(c => new THREE.Vector3(c.x, 0.02, c.y))
    );
    const borderMaterial = new THREE.LineBasicMaterial({ 
      color: new THREE.Color(color),
      linewidth: 2
    });
    const border = new THREE.Line(borderGeometry, borderMaterial);
    scene.add(border);
  };

  const drawLayout3D = (scene: THREE.Scene, layout: GeneratedLayout) => {
    const ilots = layout.ilotData as any[];
    const corridors = layout.corridorData as any[];

    // Draw corridors
    corridors.forEach(corridor => {
      const corridorHeight = 0.05;
      const geometry = new THREE.BoxGeometry(
        corridor.width,
        corridorHeight,
        corridor.height
      );
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xe5e7eb,
        roughness: 0.9,
        metalness: 0.0
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        corridor.x + corridor.width / 2,
        corridorHeight / 2,
        corridor.y + corridor.height / 2
      );
      mesh.receiveShadow = true;
      
      scene.add(mesh);
    });

    // Draw ilots
    ilots.forEach(ilot => {
      const ilotHeight = 2.5;
      const geometry = new THREE.BoxGeometry(
        ilot.width,
        ilotHeight,
        ilot.height
      );
      
      const isSelected = selectedIlot === ilot.id;
      const material = new THREE.MeshStandardMaterial({ 
        color: isSelected ? 0x10b981 : 0xddd6fe,
        roughness: 0.6,
        metalness: 0.1
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        ilot.x + ilot.width / 2,
        ilotHeight / 2,
        ilot.y + ilot.height / 2
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.ilotId = ilot.id;
      
      scene.add(mesh);

      // Add ilot label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.fillStyle = 'black';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText(`${ilot.area.toFixed(1)}m²`, canvas.width / 2, canvas.height / 2 + 8);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: texture });
      const label = new THREE.Sprite(labelMaterial);
      label.position.set(
        ilot.x + ilot.width / 2,
        ilotHeight + 0.5,
        ilot.y + ilot.height / 2
      );
      label.scale.set(2, 0.5, 1);
      
      scene.add(label);
    });
  };

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full bg-gray-100', className)}
      style={{ minHeight: '400px' }}
    />
  );
}