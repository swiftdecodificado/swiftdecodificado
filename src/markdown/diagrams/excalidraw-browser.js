import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';
import { convertToExcalidrawElements, exportToSvg } from '@excalidraw/excalidraw';

// Pastel colors from Excalidraw's palette. Shape, not label text or position,
// selects the fill so styling cannot invent domain meaning or change the graph.
const palette = {
  ink: '#1e1e1e',
  process: '#a5d8ff',
  decision: '#ffec99',
  background: '#ffffff',
};

window.renderDiagram = async (source) => {
  const { elements, files } = await parseMermaidToExcalidraw(source, {
    themeVariables: { fontSize: '20px' },
  });
  const scene = convertToExcalidrawElements(elements);
  // Keep the same geometry, bindings and solid/dashed relations from Mermaid.
  // Fixed seeds make repeated builds visually stable.
  scene.forEach((element, index) => {
    element.seed = index + 1;
    element.roughness = 1;
    element.strokeColor = palette.ink;
    if (element.type === 'rectangle' || element.type === 'ellipse') {
      element.backgroundColor = palette.process;
      element.fillStyle = 'solid';
    } else if (element.type === 'diamond') {
      element.backgroundColor = palette.decision;
      element.fillStyle = 'solid';
    }
  });
  const svg = await exportToSvg({
    elements: scene,
    files,
    appState: { exportBackground: true, viewBackgroundColor: palette.background, exportWithDarkMode: false },
    exportPadding: 16,
    exportEmbedScene: false,
  });
  return new XMLSerializer().serializeToString(svg);
};
