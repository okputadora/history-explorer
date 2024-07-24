import { useEffect, useState, useRef } from "react";
import { getPersonData } from "./utils/fetch";
import Tree from "react-d3-tree";
import dTree from "d3-dtree";
import _ from 'lodash'
import * as d3 from 'd3'
import './App.css'

window.d3 = d3;
window._ = _;
const d = [
  {
      "name": "Father", // The name of the node
      "class": "node", // The CSS class of the node
      "textClass": "nodeText", // The CSS class of the text in the node
      "depthOffset": 1, // Generational height offset
      "marriages": [
      { // Marriages is a list of nodes
          "spouse":
          { // Each marriage has one spouse
              "name": "Mother",
          },
          "children": [
          { // List of children nodes
              "name": "Child",
              "marriages": [{
                "spouse": {
                  name: 'test'
                },
                children: [{
                  name: "test2"
                }]
          }]
          }]
      }],
      "extra":
      {} // Custom data passed to renderers
  }]
function App() {
  const [results, setResults] = useState(d)
  const fetchPerson = async (name) => {
    const data = await getPersonData(name);
    // setResults(data);
  }
  const graphRef = useRef();
  useEffect(() => {
    dTree.init(results, { target: "#graph", width: 300, height: 900});
    fetchPerson("Henry VIII")
  }, [])
  console.log({results})
  return (
    // <div style={{ width: '50em', height: '20em', border: '1px solid red' }}>
    <div id="graph" style={{border: '1px solid red', height: 900, width: 300}}/>
  // </div>
  );
}

export default App;
