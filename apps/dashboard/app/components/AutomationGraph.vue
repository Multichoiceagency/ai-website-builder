<script setup lang="ts">
import { computed } from 'vue'
import type { Automation, AutomationNode, AutomationNodeRun } from '@platform/schemas'

/**
 * The stored automation graph, drawn.
 *
 * Positioned boxes plus one inline `<svg>` of connector paths — no graph
 * library. A node graph this shape (a handful of nodes, one entry, edges that
 * only ever point forward) needs a layered layout and some bezier curves, and
 * pulling in a rendering engine for that would trade a hundred lines here for
 * a dependency, a bundle and a licence.
 *
 * Passing `nodeRuns` turns the same drawing into a run inspector: each node
 * picks up the status it actually reached, and everything with no row simply
 * never executed — which is the answer to "why did this run stop?".
 */
const props = withDefaults(
  defineProps<{
    graph: Automation['graph']
    nodeRuns?: AutomationNodeRun[]
    /** The node a waiting run is parked on. */
    currentNodeId?: string | null
  }>(),
  { nodeRuns: () => [], currentNodeId: null },
)

const NODE_WIDTH = 208
const NODE_HEIGHT = 76
const GAP_X = 40
const GAP_Y = 56

interface Placed {
  node: AutomationNode
  x: number
  y: number
  depth: number
}

interface Edge {
  id: string
  path: string
  label: string
  labelX: number
  labelY: number
}

const KIND_LABELS: Record<string, string> = {
  trigger: 'When',
  condition: 'Only if',
  delay: 'Wait',
  branch: 'Split',
  action: 'Then',
}

const KIND_TONES: Record<string, string> = {
  trigger: 'border-brand/50 bg-brand-soft',
  condition: 'border-line bg-raised',
  delay: 'border-line bg-raised',
  branch: 'border-line bg-raised',
  action: 'border-positive/40 bg-positive-soft',
}

const STATUS_RINGS: Record<string, string> = {
  completed: 'ring-2 ring-positive',
  failed: 'ring-2 ring-danger',
  skipped: 'ring-2 ring-warning',
}

const byId = computed(() => new Map(props.graph.nodes.map((node) => [node.id, node])))

const runStatus = computed(() => {
  const map = new Map<string, AutomationNodeRun>()
  for (const run of props.nodeRuns) map.set(run.nodeId, run)
  return map
})

function outgoing(node: AutomationNode): { to: string; label: string }[] {
  const edges = node.branches
    .filter((branch) => branch.next)
    .map((branch) => ({ to: branch.next!, label: branch.label || branch.key }))

  // A branch node's `next` is its fallback, so it is labelled as one rather
  // than drawn as an unexplained extra arrow.
  if (node.next) edges.push({ to: node.next, label: node.kind === 'branch' ? 'otherwise' : '' })
  return edges
}

/**
 * Layered layout: depth is the shortest number of hops from the entry node,
 * and siblings at the same depth sit side by side. Anything unreachable is
 * parked in a final row rather than dropped — an orphaned node is exactly the
 * kind of thing someone opened this view to find.
 */
const layout = computed(() => {
  const depths = new Map<string, number>()
  const queue: string[] = []

  if (byId.value.has(props.graph.entryNodeId)) {
    depths.set(props.graph.entryNodeId, 0)
    queue.push(props.graph.entryNodeId)
  }

  while (queue.length) {
    const id = queue.shift()!
    const node = byId.value.get(id)
    if (!node) continue

    for (const edge of outgoing(node)) {
      if (depths.has(edge.to)) continue
      depths.set(edge.to, (depths.get(id) ?? 0) + 1)
      queue.push(edge.to)
    }
  }

  const maxDepth = depths.size ? Math.max(...depths.values()) : 0
  for (const node of props.graph.nodes) {
    if (!depths.has(node.id)) depths.set(node.id, maxDepth + 1)
  }

  const rows = new Map<number, AutomationNode[]>()
  for (const node of props.graph.nodes) {
    const depth = depths.get(node.id)!
    const row = rows.get(depth)
    if (row) row.push(node)
    else rows.set(depth, [node])
  }

  const widest = Math.max(1, ...[...rows.values()].map((row) => row.length))
  const width = widest * NODE_WIDTH + (widest - 1) * GAP_X
  const placed: Placed[] = []

  for (const [depth, row] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const rowWidth = row.length * NODE_WIDTH + (row.length - 1) * GAP_X
    const offset = (width - rowWidth) / 2

    row.forEach((node, index) => {
      placed.push({
        node,
        x: offset + index * (NODE_WIDTH + GAP_X),
        y: depth * (NODE_HEIGHT + GAP_Y),
        depth,
      })
    })
  }

  const positions = new Map(placed.map((entry) => [entry.node.id, entry]))
  const edges: Edge[] = []

  for (const entry of placed) {
    for (const edge of outgoing(entry.node)) {
      const target = positions.get(edge.to)
      if (!target) continue

      const startX = entry.x + NODE_WIDTH / 2
      const startY = entry.y + NODE_HEIGHT
      const endX = target.x + NODE_WIDTH / 2
      const endY = target.y
      const midY = (startY + endY) / 2

      edges.push({
        id: `${entry.node.id}->${edge.to}`,
        path: `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`,
        label: edge.label,
        labelX: (startX + endX) / 2,
        labelY: midY,
      })
    }
  }

  return {
    placed,
    edges,
    width,
    height: (Math.max(...[...rows.keys()]) + 1) * NODE_HEIGHT + Math.max(0, rows.size - 1) * GAP_Y,
  }
})

function describe(node: AutomationNode): string {
  if (node.kind === 'trigger') return node.event || 'triggered by hand'
  if (node.kind === 'condition' && node.condition) {
    return `${node.condition.field} ${node.condition.operator} ${node.condition.value ?? ''}`.trim()
  }
  if (node.kind === 'delay') {
    const seconds = node.delaySeconds ?? 0
    if (seconds < 3600) return `${Math.round(seconds / 60)} minute(s)`
    if (seconds < 86_400) return `${Math.round(seconds / 3600)} hour(s)`
    return `${Math.round(seconds / 86_400)} day(s)`
  }
  if (node.kind === 'branch') return `${node.branches.length} branch(es)`
  if (node.kind === 'action' && node.action) return node.action.type
  return node.kind
}
</script>

<template>
  <div class="overflow-x-auto">
    <div
      class="relative mx-auto"
      :style="{ width: `${layout.width}px`, height: `${layout.height}px`, minWidth: `${layout.width}px` }"
    >
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        aria-hidden="true"
      >
        <defs>
          <marker id="automation-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <g class="text-line-strong">
          <path
            v-for="edge in layout.edges"
            :key="edge.id"
            :d="edge.path"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            marker-end="url(#automation-arrow)"
          />
        </g>
        <g class="fill-current text-faint" font-size="10">
          <text
            v-for="edge in layout.edges.filter((candidate) => candidate.label)"
            :key="`${edge.id}-label`"
            :x="edge.labelX"
            :y="edge.labelY"
            text-anchor="middle"
          >
            {{ edge.label }}
          </text>
        </g>
      </svg>

      <div
        v-for="entry in layout.placed"
        :key="entry.node.id"
        class="absolute rounded-lg border px-3 py-2.5 shadow-card"
        :class="[
          KIND_TONES[entry.node.kind] ?? 'border-line bg-raised',
          STATUS_RINGS[runStatus.get(entry.node.id)?.status ?? ''] ?? '',
          currentNodeId === entry.node.id ? 'ring-2 ring-brand' : '',
        ]"
        :style="{
          left: `${entry.x}px`,
          top: `${entry.y}px`,
          width: `${NODE_WIDTH}px`,
          height: `${NODE_HEIGHT}px`,
        }"
      >
        <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint">
          {{ KIND_LABELS[entry.node.kind] ?? entry.node.kind }}
        </p>
        <p class="truncate text-[0.8125rem] font-medium text-ink">{{ entry.node.label || describe(entry.node) }}</p>
        <p v-if="entry.node.label" class="truncate text-[0.75rem] text-soft">{{ describe(entry.node) }}</p>
        <p
          v-else-if="runStatus.get(entry.node.id)"
          class="truncate text-[0.75rem]"
          :class="runStatus.get(entry.node.id)?.status === 'failed' ? 'text-danger' : 'text-soft'"
        >
          {{ runStatus.get(entry.node.id)?.error || runStatus.get(entry.node.id)?.status }}
        </p>
      </div>
    </div>
  </div>
</template>
