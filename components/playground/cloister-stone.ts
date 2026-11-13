import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const STONE_URL = "/assets/playground/cloister-stone.webp";
const DETAIL_URL = "/assets/playground/cloister-stone-detail.webp";

export function useCloisterStone() {
  const [baseColor, detail] = useLoader(THREE.TextureLoader, [STONE_URL, DETAIL_URL]);
  const maps = useMemo(() => {
    const map = baseColor.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    const surface = detail.clone();
    for (const texture of [map, surface]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
    }
    return { map, bumpMap: surface, roughnessMap: surface };
  }, [baseColor, detail]);
  useEffect(() => () => { maps.map.dispose(); maps.bumpMap.dispose(); }, [maps]);
  return maps;
}

export type CloisterStone = ReturnType<typeof useCloisterStone>;
