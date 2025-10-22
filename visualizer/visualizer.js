// visualizer.js - renders a force-directed mind map from chrome.storage.currentSession
(function () {
  // Wait for d3 to be available
  function whenD3(cb) {
    if (window.d3) return cb();
    setTimeout(() => whenD3(cb), 100);
  }

  whenD3(() => {
    const svg = d3.select('#map-canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;
    svg.attr('width', width).attr('height', height);

    let linkGroup = svg.append('g').attr('class', 'links');
    let nodeGroup = svg.append('g').attr('class', 'nodes');

  // Notes panel elements
  const notesPanel = document.getElementById('notes-panel');
  const notesTitle = document.getElementById('notes-title');
  const notesTextarea = document.getElementById('notes-textarea');
  const notesSaveBtn = document.getElementById('notes-save-btn');
  const notesCloseBtn = document.getElementById('notes-close');
  let selectedNode = null;

    function render(session) {
      const nodes = (session && session.nodes) ? session.nodes.map(n => Object.assign({}, n)) : [];
      const edges = (session && session.edges) ? session.edges.map(e => Object.assign({}, e)) : [];
      // compute a group (hostname) for each node
      nodes.forEach(n => {
        try {
          n.group = new URL(n.id).hostname;
        } catch (e) {
          n.group = 'unknown';
        }
      });

      // compute distinct groups and a scale of x-coordinates for cluster centers
      const groups = Array.from(new Set(nodes.map(n => n.group)));
      const xScale = d3.scalePoint().domain(groups).range([100, width - 100]);

  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(groups);
  // precompute fill color on each node to avoid referencing `color` in attribute callbacks
  nodes.forEach(n => { n.fill = color(n.group); });

      const links = edges.map(e => ({ source: e.source, target: e.target }));

      svg.selectAll('.links line').remove();
      svg.selectAll('.nodes g').remove();

      // create link and node elements
      const link = linkGroup.selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#9CA3AF')
        .attr('stroke-width', 1.5);

      const node = nodeGroup.selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
        );

      node.append('circle')
        .attr('r', 18)
        .attr('fill', d => d.fill || '#167c5fff')
        .attr('stroke', '#111827')
        .attr('stroke-width', 1.5)
        .on('click', function(event, d) {
          // Ignore clicks that originate from dragging
          if (event.defaultPrevented) return;
          selectedNode = d;
          notesTitle.textContent = d.title || d.id;
          notesTextarea.value = d.notes || '';
          if (notesPanel) notesPanel.classList.remove('hidden');
        });

      node.append('text')
        .text(d => d.title ? (d.title.length > 30 ? d.title.slice(0,27) + '...' : d.title) : d.id)
        .attr('x', 22)
        .attr('y', 6)
        .attr('font-size', 12)
        .attr('fill', '#111827');

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(140).strength(0.6))
        .force('charge', d3.forceManyBody().strength(-600))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(26)) // prevents node overlap
        .on('tick', ticked)
        .force('x', d3.forceX(d => xScale(d.group)).strength(0.25))
        .force('y', d3.forceY(height / 2).strength(0.05));

      function ticked() {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      }

      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }

    // initial render
    chrome.storage.local.get('currentSession', (res) => render(res.currentSession || { nodes: [], edges: [] }));

    // watch for updates
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.currentSession) {
        render(changes.currentSession.newValue);
      }
    });

    // Notes panel event handlers
    if (notesCloseBtn) {
      notesCloseBtn.addEventListener('click', () => {
        if (notesPanel) notesPanel.classList.add('hidden');
        selectedNode = null;
      });
    }

    if (notesSaveBtn) {
      notesSaveBtn.addEventListener('click', () => {
        if (!selectedNode) return;
        const noteText = notesTextarea.value;
        selectedNode.notes = noteText;
        chrome.storage.local.get('currentSession', (res) => {
          const session = res && res.currentSession ? res.currentSession : { nodes: [], edges: [] };
          const idx = (session.nodes || []).findIndex(n => n.id === selectedNode.id);
          if (idx !== -1) {
            session.nodes[idx].notes = noteText;
          } else {
            session.nodes = session.nodes || [];
            session.nodes.push(selectedNode);
          }
          chrome.storage.local.set({ currentSession: session }, () => {
            console.log('Saved note for', selectedNode.id);
            if (notesPanel) notesPanel.classList.add('hidden');
            selectedNode = null;
          });
        });
      });
    }

    // handle resize
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      svg.attr('width', w).attr('height', h);
    });
  });
})();
