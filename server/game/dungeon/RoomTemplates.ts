import { EnvObjectState } from '../../../shared/types';
import { PILLAR_HP, PILLAR_SIZE } from '../../../shared/constants';

export interface RoomTemplate {
  minWidth: number;
  minHeight: number;
  carve(roomX: number, roomY: number, roomW: number, roomH: number): {
    carvedTiles: { col: number; row: number }[];
    envObjects: EnvObjectState[];
  };
}

const TILE_SIZE = 32;

export const ROOM_TEMPLATES: Record<string, RoomTemplate> = {
  none: {
    minWidth: 0,
    minHeight: 0,
    carve(_roomX: number, _roomY: number, _roomW: number, _roomH: number) {
      return { carvedTiles: [], envObjects: [] };
    },
  },

  cross: {
    minWidth: 192,
    minHeight: 192,
    carve(roomX: number, roomY: number, roomW: number, roomH: number) {
      const carvedTiles: { col: number; row: number }[] = [];
      const carveW = Math.floor(roomW * 0.25);
      const carveH = Math.floor(roomH * 0.25);

      // Top-left corner
      for (let dy = 0; dy < carveH; dy += TILE_SIZE) {
        for (let dx = 0; dx < carveW; dx += TILE_SIZE) {
          carvedTiles.push({
            col: Math.floor((roomX + dx) / TILE_SIZE),
            row: Math.floor((roomY + dy) / TILE_SIZE),
          });
        }
      }

      // Top-right corner
      for (let dy = 0; dy < carveH; dy += TILE_SIZE) {
        for (let dx = 0; dx < carveW; dx += TILE_SIZE) {
          carvedTiles.push({
            col: Math.floor((roomX + roomW - TILE_SIZE - dx) / TILE_SIZE),
            row: Math.floor((roomY + dy) / TILE_SIZE),
          });
        }
      }

      // Bottom-left corner
      for (let dy = 0; dy < carveH; dy += TILE_SIZE) {
        for (let dx = 0; dx < carveW; dx += TILE_SIZE) {
          carvedTiles.push({
            col: Math.floor((roomX + dx) / TILE_SIZE),
            row: Math.floor((roomY + roomH - TILE_SIZE - dy) / TILE_SIZE),
          });
        }
      }

      // Bottom-right corner
      for (let dy = 0; dy < carveH; dy += TILE_SIZE) {
        for (let dx = 0; dx < carveW; dx += TILE_SIZE) {
          carvedTiles.push({
            col: Math.floor((roomX + roomW - TILE_SIZE - dx) / TILE_SIZE),
            row: Math.floor((roomY + roomH - TILE_SIZE - dy) / TILE_SIZE),
          });
        }
      }

      return { carvedTiles, envObjects: [] };
    },
  },

  l_shape: {
    minWidth: 160,
    minHeight: 160,
    carve(roomX: number, roomY: number, roomW: number, roomH: number) {
      const carvedTiles: { col: number; row: number }[] = [];
      const carveW = Math.floor(roomW * 0.4);
      const carveH = Math.floor(roomH * 0.4);

      // Carve top-right corner
      for (let dy = 0; dy < carveH; dy += TILE_SIZE) {
        for (let dx = 0; dx < carveW; dx += TILE_SIZE) {
          carvedTiles.push({
            col: Math.floor((roomX + roomW - TILE_SIZE - dx) / TILE_SIZE),
            row: Math.floor((roomY + dy) / TILE_SIZE),
          });
        }
      }

      return { carvedTiles, envObjects: [] };
    },
  },

  pillars_4: {
    minWidth: 160,
    minHeight: 160,
    carve(roomX: number, roomY: number, roomW: number, roomH: number) {
      const envObjects: EnvObjectState[] = [];
      const quadrants = ['tl', 'tr', 'bl', 'br'];

      for (const quad of quadrants) {
        let px: number;
        let py: number;

        switch (quad) {
          case 'tl':
            px = roomX + roomW * 0.25;
            py = roomY + roomH * 0.25;
            break;
          case 'tr':
            px = roomX + roomW * 0.75;
            py = roomY + roomH * 0.25;
            break;
          case 'bl':
            px = roomX + roomW * 0.25;
            py = roomY + roomH * 0.75;
            break;
          case 'br':
            px = roomX + roomW * 0.75;
            py = roomY + roomH * 0.75;
            break;
          default:
            px = roomX + roomW * 0.5;
            py = roomY + roomH * 0.5;
        }

        // Tile-align the position
        const alignedX = Math.floor(px / TILE_SIZE) * TILE_SIZE;
        const alignedY = Math.floor(py / TILE_SIZE) * TILE_SIZE;

        envObjects.push({
          id: `pillar_${roomX}_${quad}`,
          type: 'pillar',
          x: alignedX,
          y: alignedY,
          width: PILLAR_SIZE,
          height: PILLAR_SIZE,
          hp: PILLAR_HP,
          hpMax: PILLAR_HP,
          alive: true,
        });
      }

      return { carvedTiles: [], envObjects };
    },
  },

  diamond: {
    minWidth: 192,
    minHeight: 192,
    carve(roomX: number, roomY: number, roomW: number, roomH: number) {
      const carvedTiles: { col: number; row: number }[] = [];
      const roomCenterX = roomX + roomW / 2;
      const roomCenterY = roomY + roomH / 2;
      const halfWidth = roomW / 2;
      const halfHeight = roomH / 2;

      const tilesX = Math.floor(roomW / TILE_SIZE);
      const tilesY = Math.floor(roomH / TILE_SIZE);

      for (let row = 0; row < tilesY; row++) {
        for (let col = 0; col < tilesX; col++) {
          const tileCenterX = roomX + col * TILE_SIZE + TILE_SIZE / 2;
          const tileCenterY = roomY + row * TILE_SIZE + TILE_SIZE / 2;

          const normalizedDist =
            Math.abs(tileCenterX - roomCenterX) / halfWidth +
            Math.abs(tileCenterY - roomCenterY) / halfHeight;

          if (normalizedDist > 1.0) {
            carvedTiles.push({
              col: Math.floor((roomX + col * TILE_SIZE) / TILE_SIZE),
              row: Math.floor((roomY + row * TILE_SIZE) / TILE_SIZE),
            });
          }
        }
      }

      return { carvedTiles, envObjects: [] };
    },
  },
};
