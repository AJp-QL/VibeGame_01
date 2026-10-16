import { GLYPH_ALPHA, glyphColour, TERRAIN_COLOURS, TERRAIN_GLYPHS } from '@mt/battle'
import type { Terrain } from '@mt/shared'
import { th } from './strings.ts'

const TERRAINS: readonly Terrain[] = ['normal', 'forest', 'water', 'mountain', 'desert', 'light', 'dark']

const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`

/** The same colour and corner mark as a Board tile (battle palette), as a tiny SVG. */
export function TerrainSwatch({ terrain }: { terrain: Terrain }) {
  const mark = hex(glyphColour(terrain))
  return (
    <svg className="swatch" viewBox="0 0 12 12" width="24" height="24" aria-hidden="true" shapeRendering="crispEdges">
      <rect width="12" height="12" fill={hex(TERRAIN_COLOURS[terrain])} />
      {TERRAIN_GLYPHS[terrain].flatMap((row, y) =>
        [...row].flatMap((cell, x) =>
          cell === '#' ? [<rect key={`${x}-${y}`} x={x + 2} y={y + 2} width="1" height="1" fill={mark} fillOpacity={GLYPH_ALPHA} />] : [],
        ),
      )}
    </svg>
  )
}

/** Every kind of tile under the Board, and the position rules behind a tap. */
export function TerrainLegend() {
  return (
    <section className="panel legend">
      <ul className="swatches">
        {TERRAINS.map((terrain) => (
          <li key={terrain}>
            <TerrainSwatch terrain={terrain} /> {th.terrain[terrain]}
          </li>
        ))}
      </ul>
      <details>
        <summary>{th.legendTitle}</summary>
        <ul>
          <li>{th.legendWheel}</li>
          <li>{th.legendTerrain}</li>
          <li>{th.legendProtection}</li>
          <li>{th.legendLineOfSight}</li>
        </ul>
      </details>
    </section>
  )
}
