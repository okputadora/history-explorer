import axios from 'axios'

const WIKI_BASE_PATH = 'https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query='
const TEST = 'https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=PREFIX+foaf%3A+%3Chttp%3A%2F%2Fxmlns.com%2Ffoaf%2F0.1%2F%3E+%0D%0APREFIX+dbo%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fontology%2F%3E+%0D%0APREFIX+dbp%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fproperty%2F%3E+%0D%0A%0D%0ASELECT+DISTINCT+%3FpageId+%3Fperson+%3Fspouse+%3Fparent+%3Fchild%0D%0AWHERE+%7B+++%0D%0A++%3Fperson+a+dbo%3APerson.+++%0D%0A++%3Fperson+rdfs%3Alabel%22Queen+Victoria%22%40en.%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3AwikiPageID+%3FpageId.+%7D%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3Aspouse+%3Fspouse.+%7D%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3Aparent+%3Fparent.+%7D%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3Achild+%3Fchild.+%7D%0D%0A%7D+&format=application%2Fsparql-results%2Bjson&timeout=30000&signal_void=on&signal_unconnected=on'

export const getPersonData = async (name) => {
  // return []
  // const results = await axios.get(WIKI_BASE_PATH + encodeURI(getPersonQuery(name)))
  // const formattedResults = formatFamilyTree(results);
  const children = await axios.get(WIKI_BASE_PATH + encodeURI(getChildren(name)))
  console.log({children: children.data.results.bindings})
  // process results
  // return formattedResults;
}

export const BASE_QUERY = `
  PREFIX foaf: <http://xmlns.com/foaf/0.1/> 
  PREFIX dbo: <http://dbpedia.org/ontology/> 
  PREFIX dbp: <http://dbpedia.org/property/> 

`

//@TODO need to check dbo.spouse and dbp.spouses

export const getPersonQuery = name => BASE_QUERY + `
  SELECT DISTINCT ?pageId ?person ?name ?spouse ?spouseName ?parent ?parentName ?child ?childName
  WHERE {   
    ?person a dbo:Person.   
    ?person rdfs:label "${name}"@en.
    ?person rdfs:label ?name.
    FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
    OPTIONAL { ?person dbo:wikiPageID ?pageId. }
    OPTIONAL { ?person dbp:spouses ?spouse. 
    ?spouse rdfs:label ?spouseName
    }
    OPTIONAL { ?person dbo:parent ?parent.
    ?parent rdfs:label ?parentName
    }
    OPTIONAL { ?person dbo:child ?child.
    ?child rdfs:label ?childName
    }
    FILTER (!bound(?spouseName) || langMatches( lang(?spouseName), "EN" ))
    FILTER (!bound(?parentName) || langMatches( lang(?parentName), "EN" ))
    FILTER (!bound(?childName) || langMatches( lang(?childName), "EN" ))
  } 
`

export const getChildren = name => BASE_QUERY + `
   SELECT DISTINCT ?person ?name ?parent ?father
  WHERE {   
    ?person a dbo:Person.   
    ?person rdfs:label ?name.
    ?person dbo:parent ?parent.
    ?person dbr:father ?father
    { ?father rdfs:label "${name}"@en } UNION
    { ?parent rdfs:label "${name}"@en }
    FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
  } 
`

const getParentsAndChildren = name => BASE_QUERY + `
  SELECT ?person ?relationship ?relative WHERE {
  # Substitute 'Person_Name' with the person's name of interest
  ?person rdfs:label "${name}"@en .
  
  # Fetch person's parents
  { ?person dbo:parent ?relative . BIND("Parent" AS ?relationship) }
  UNION
  # Fetch person's children
  { ?relative dbo:parent ?person . BIND("Child" AS ?relationship) }
}
`

const getParents = name => BASE_QUERY + `
  SELECT ?person ?relationship ?relative WHERE {
  # Substitute 'Person_Name' with the person's name of interest
  ?person rdfs:label "${name}"@en .
  
  # Fetch person's parents
  ?person dbo:parent ?relative . BIND("Parent" AS ?relationship) 
}
`

const getPersonByParentName = name => BASE_QUERY + `

`

const formatFamilyTree = (personData) => {
  const data = personData.data?.results?.bindings;
  console.log({data})
  const node = createFamilyNode(data);
  console.log({node})
  const familyTree = {
    name: 'name',
  

  }
  return familyTree;
}

const createFamilyNode = (personData) => {
  const spouses = [];
  const children = []
  const parents = []
  personData.forEach(person => {
    if (person.spouse && !spouses.map(s => s.uri).includes(person.spouse.value)) {
      spouses.push({ name: person?.spouseName?.value, uri: person.spouse.value });
    }
    if (person.child && !children.map(c => c.uri).includes(person.child?.value)) {
      children.push({ name: person?.childName?.value, uri: person.child?.value});
    }
    if (person.parent && !parents.map(c => c.uri).includes(person.parent?.value)) {
      parents.push({ name: person?.parentName?.value, uri: person.parent?.value});
    }
  })
  return {
    name: personData[0]?.name.value,
    marraiges: spouses,
    parents: parents,
    children

  }
}

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

  const test = `
   SELECT DISTINCT ?person ?name ?parent ?father
  WHERE {   
    ?person a dbo:Person.   
    ?person rdfs:label ?name.
FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
   {  ?person dbo:parent ?parent. 
     ?parent rdfs:label "Henry VIII"@en.}
UNION
{     ?person dbo:father ?father; rdfs:label "Henry VIII"@en }`

const fatherTest = ` SELECT DISTINCT ?person ?name ?father
  WHERE {   
    ?person a dbo:Person.    
    ?person rdfs:label ?name.
FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
  ?person dbo:father ?father.
  ?father rdfs:label "Henry VIII"@en


}`