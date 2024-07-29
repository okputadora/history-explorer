import React, { useEffect, useState, useRef } from 'react';
import { expandParents, getPersonData, createTreeFromList } from './utils/fetch';
import Tree from 'react-d3-tree';
import dTree from 'd3-dtree';
import _ from 'lodash';
import * as d3 from 'd3';
import './App.css';
import ReactDOMServer from 'react-dom/server';

import { Tooltip } from './utils/Tooltip';
import { PersonNode } from './PersonNode';
import dSeeder from 'dtree-seed'
window.d3 = d3;
window._ = _;

const width = 800;
const height = 900;
const halfWidth = width / 2
const halfHeight = height / 2
const xRegex = /\([^,]*,/g;
const yRegex = /,([^)]*)\)/g;
const scaleRegx = /^(?:[^()]*\([^()]*\)){1}[^()]*\(([^()]*)\)/;

function App() {
  const renderTree = (data, graphRef) => {
    // maybe memoize?
    let x = 400;
    let y = 450;
    let zoom = 0.5;
    if (graphRef?.children[0]) {
      const element = graphRef.children[0].children[0].getAttribute("transform")
      const str = element;

      let newY = str.match(yRegex)[0]
      y = parseFloat(newY?.substring(1, newY.length - 1));
      zoom = parseFloat(str.match(scaleRegx)[1]);
      let newX = str.match(xRegex)[0]
      x = parseFloat(newX.substring(1, newX.length - 1))
      graphRef.removeChild(graphRef.children[0]);
    }
    const newTree = dTree.init([data], {
      target: graphRef.current,
      width,
      height,
      callbacks: {
        nodeClick: showNodeExpandOptions,
        // nodeRenderer,
        nodeHeightSeperation: (nodeWidth, nodeMaxHeight) => nodeMaxHeight * 3
        // nodeSize,
        // @TODO overwrite nodeSize callback
      },
    });

    newTree.zoomTo((halfWidth - x) * (1 / zoom), (halfHeight - y) * (1 / zoom), zoom, 0)
    setTree(newTree);
  };

  const [currentPeople, setCurrentPeople] = useState([]);
  const [currentTree, setCurrentTree] = useState(null)
  const [currentSelectedId, setCurrentSelectedId] = useState(null);
  const [tree, setTree] = useState(null);
  const graphRef = useRef();
  const dataRef = useRef()
  const fetchPerson = async (name) => {
    const data = await getPersonData(name);
    // setResults(data);
    setCurrentPeople([data]);
    setCurrentTree(data)
    dataRef.current = [data]
    console.log({data})
    renderTree(data, graphRef.current);
  };

  useEffect(() => {
    fetchPerson('Henry VIII');
  }, []);

  useEffect(() => {
    if (currentTree) {
      renderTree(currentTree, graphRef.current);
    }
  }, [currentSelectedId]);

  const nodeRenderer = (name, x, y, height, width, extra, id, nodeClass, textClass, textRenderer) => {
    return ReactDOMServer.renderToString(
      <PersonNode selected={id === currentSelectedId} isFocused={extra.isFocused} className={nodeClass} data={{ name, height, width }} onClick={() => console.log('CLICKED HANDLED HERE')} />,
    );
  };
  const showNodeExpandOptions = (name, extra, id) => {
    const parents = expandParents(extra)
    const result = createTreeFromList([...parents, ...dataRef.current])
    setCurrentSelectedId(id);
  };
  return (
    // <div style={{ width: '50em', height: '20em', border: '1px solid red' }}>
    <div ref={graphRef} id="graph" style={{ border: '1px solid red', height: 900, width: 800 }} />
    // </div>
  );
}

export default App;
