import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function KnowledgeGraph() {
  const svgRef = useRef(null)
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [built, setBuilt] = useState(false)

  const buildGraph = async () => {
    setLoading(true)
    setSelected(null)
    try {
      const res = await api.get('/knowledge-graph')
      setGraphData(res.data)
      setStats(res.data.stats)
      setBuilt(true)
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!graphData || !svgRef.current) return
    renderGraph(graphData)
  }, [graphData])

  const renderGraph = (data) => {
    const container = svgRef.current.parentElement
    const W = container.clientWidth || 600
    const H = container.clientHeight || 500

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    // Zoom behavior
    const g = svg.append('g')
    svg.call(d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    )

    // Gradient defs
    const defs = svg.append('defs')
    const radialGrad = defs.append('radialGradient').attr('id', 'bg-grad')
    radialGrad.append('stop').attr('offset', '0%').attr('stop-color', '#041424')
    radialGrad.append('stop').attr('offset', '100%').attr('stop-color', '#020d1a')
    svg.insert('rect', ':first-child')
      .attr('width', W).attr('height', H)
      .attr('fill', 'url(#bg-grad)')
      .attr('rx', 12)

    if (data.nodes.length === 0) {
      g.append('text')
        .attr('x', W / 2).attr('y', H / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#3a6278').attr('font-size', '14px')
        .text('No data to visualize')
      return
    }

    // Force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges)
        .id(d => d.id)
        .distance(d => d.type === 'topic_connection' ? 80 : 140)
        .strength(d => d.type === 'topic_connection' ? 0.6 : 0.3)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 10))

    // Edge lines
    const link = g.append('g').selectAll('line')
      .data(data.edges).join('line')
      .attr('stroke', d => d.type === 'direct_connection' ? 'rgba(0,212,224,0.3)' : 'rgba(0,212,224,0.12)')
      .attr('stroke-width', d => d.type === 'direct_connection' ? Math.min(d.strength, 4) : 1)
      .attr('stroke-dasharray', d => d.type === 'topic_connection' ? '4,3' : null)

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(data.nodes).join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (event, d) => { event.stopPropagation(); setSelected(d) })

    // Node circles
    node.append('circle')
      .attr('r', d => d.size || 12)
      .attr('fill', d => d.node_type === 'topic' ? 'rgba(0,212,224,0.1)' : `${d.color}22`)
      .attr('stroke', d => d.color || '#00d4e0')
      .attr('stroke-width', d => d.node_type === 'topic' ? 1 : 2)

    // Glow effect for source nodes
    node.filter(d => d.node_type === 'source')
      .append('circle')
      .attr('r', d => (d.size || 12) + 6)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1)
      .attr('opacity', 0.2)

    // Node labels
    node.append('text')
      .text(d => d.node_type === 'topic' ? d.label : d.icon)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.node_type === 'topic' ? 4 : 5)
      .attr('font-size', d => d.node_type === 'topic' ? '10px' : '14px')
      .attr('fill', d => d.node_type === 'topic' ? '#00d4e0' : 'white')
      .attr('font-family', d => d.node_type === 'topic' ? 'JetBrains Mono, monospace' : 'inherit')
      .attr('pointer-events', 'none')

    // Source name labels below node
    node.filter(d => d.node_type === 'source')
      .append('text')
      .text(d => d.label.slice(0, 20))
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.size || 12) + 16)
      .attr('font-size', '9px')
      .attr('fill', '#3a6278')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('pointer-events', 'none')

    // Tick update
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Click on background to deselect
    svg.on('click', () => setSelected(null))
  }

  const card = {
    background: 'rgba(7,30,51,0.8)',
    border: '1px solid rgba(20,168,173,0.2)',
    borderRadius: '12px', padding: '14px',
    backdropFilter: 'blur(10px)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '12px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#00d4e0', fontFamily: 'JetBrains Mono' }}>
            // KNOWLEDGE GRAPH
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Visual map of how your documents connect
          </div>
        </div>
        <button
          onClick={buildGraph}
          disabled={loading}
          style={{
            background: loading ? 'rgba(0,0,0,0.2)' : 'linear-gradient(135deg, rgba(0,212,224,0.2), rgba(0,212,224,0.1))',
            border: '1px solid rgba(0,212,224,0.3)',
            borderRadius: '10px', padding: '8px 16px',
            color: loading ? 'var(--text-muted)' : '#00d4e0',
            fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Outfit', fontWeight: 600
          }}
        >
          {loading ? '⚙️ Building...' : built ? '🔄 Rebuild' : '🕸 Build Graph'}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {[
            { label: 'Sources', value: stats.sources, color: '#00d4e0' },
            { label: 'Topics', value: stats.topics, color: '#7fffd4' },
            { label: 'Connections', value: stats.connections, color: '#a78bfa' },
          ].map((s, i) => (
            <div key={i} style={{ ...card, flex: 1, textAlign: 'center', padding: '10px 6px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Graph canvas */}
      <div style={{
        flex: 1, minHeight: 0, position: 'relative',
        background: 'rgba(2,13,26,0.8)',
        border: '1px solid rgba(20,168,173,0.15)',
        borderRadius: '12px', overflow: 'hidden'
      }}>
        {!built && !loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            <div style={{ fontSize: '48px' }}>🕸</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
              Click "Build Graph" to generate<br/>a visual map of your knowledge base
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', opacity: 0.5 }}>
              Uses Llama 3.1 to extract topics · Takes ~30 seconds
            </div>
          </div>
        )}

        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#00d4e0',
                  animation: `wave 1.2s ${i*0.15}s ease-in-out infinite`
                }} />
              ))}
            </div>
            <div style={{ color: '#00d4e0', fontSize: '13px', fontFamily: 'JetBrains Mono' }}>
              Extracting topics with Llama 3.1...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Analyzing your documents, emails, and videos
            </div>
          </div>
        )}

        <svg ref={svgRef} style={{ width: '100%', height: '100%', display: built ? 'block' : 'none' }} />
      </div>

      {/* Selected node info */}
      {selected && (
        <div style={{
          ...card, flexShrink: 0,
          borderLeft: `3px solid ${selected.color || '#00d4e0'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>{selected.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: selected.color || '#00d4e0' }}>
              {selected.full_label || selected.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {selected.node_type === 'source' && (
              <>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  TYPE: {selected.type}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  CHUNKS: {selected.chunk_count}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  DATE: {selected.date}
                </span>
              </>
            )}
            {selected.node_type === 'topic' && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                SHARED BY: {selected.connected_sources} sources
              </span>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {built && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
          {[
            { color: '#ef4444', label: 'PDF' },
            { color: '#f59e0b', label: 'Email' },
            { color: '#ec4899', label: 'YouTube' },
            { color: '#a78bfa', label: 'Notion' },
            { color: '#00d4e0', label: 'Topic Node' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, boxShadow: `0 0 4px ${l.color}88` }} />
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{l.label}</span>
            </div>
          ))}
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>
            drag nodes · scroll to zoom · click to inspect
          </span>
        </div>
      )}

      <style>{`@keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  )
}