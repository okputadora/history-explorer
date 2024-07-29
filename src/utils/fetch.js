import axios from 'axios';

const WIKI_BASE_PATH = 'https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=';
const TEST =
  'https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=PREFIX+foaf%3A+%3Chttp%3A%2F%2Fxmlns.com%2Ffoaf%2F0.1%2F%3E+%0D%0APREFIX+dbo%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fontology%2F%3E+%0D%0APREFIX+dbp%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fproperty%2F%3E+%0D%0A%0D%0ASELECT+DISTINCT+%3FpageId+%3Fperson+%3Fspouse+%3Fparent+%3Fchild%0D%0AWHERE+%7B+++%0D%0A++%3Fperson+a+dbo%3APerson.+++%0D%0A++%3Fperson+rdfs%3Alabel%22Queen+Victoria%22%40en.%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3AwikiPageID+%3FpageId.+%7D%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3Aspouse+%3Fspouse.+%7D%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3Aparent+%3Fparent.+%7D%0D%0A++OPTIONAL+%7B+%3Fperson+dbo%3Achild+%3Fchild.+%7D%0D%0A%7D+&format=application%2Fsparql-results%2Bjson&timeout=30000&signal_void=on&signal_unconnected=on';

export const getPersonData = async (name) => {
  const spousesAndParents = await axios.get(WIKI_BASE_PATH + encodeURI(getSpousesAndParents(name)));
  const people = formatPersonNode(spousesAndParents.data.results.bindings);
  const children = await axios.get(WIKI_BASE_PATH + encodeURI(getPersonByParentName(name)))
  const formattedChildren = formatChildrenNodes(children)
  console.log({people, formattedChildren})
  const tree = createTreeFromList([...people, ...formattedChildren])
  return tree;
};

export const BASE_QUERY = `
  PREFIX foaf: <http://xmlns.com/foaf/0.1/> 
  PREFIX dbo: <http://dbpedia.org/ontology/> 
  PREFIX dbp: <http://dbpedia.org/property/> 

`;

//@TODO need to check dbo.spouse and dbp.spouses

export const getPersonQuery = (name) =>
  BASE_QUERY +
  `
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
`;

export const getChildren = (name) =>
  BASE_QUERY +
  `
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
`;

const getParentsAndChildren = (name) =>
  BASE_QUERY +
  `
  SELECT ?person ?relationship ?relative WHERE {
  # Substitute 'Person_Name' with the person's name of interest
  ?person rdfs:label "${name}"@en .
  
  # Fetch person's parents
  { ?person dbo:parent ?relative . BIND("Parent" AS ?relationship) }
  UNION
  # Fetch person's children
  { ?relative dbo:parent ?person . BIND("Child" AS ?relationship) }
}
`;

const getParents = (name) =>
  BASE_QUERY +
  `
  SELECT ?person ?relationship ?relative WHERE {
  # Substitute 'Person_Name' with the person's name of interest
  ?person rdfs:label "${name}"@en .
  
  # Fetch person's parents
  ?person dbo:parent ?relative . BIND("Parent" AS ?relationship) 
}
`;

const getSpouses = (name) =>
  BASE_QUERY +
  `
  SELECT ?person ?spouse
  WHERE {
    ?person a dbo:Person .
    ?person rdfs:label "${name}"@en .
    ?person dbp:spouses ?spouse.
    FILTER (isURI(?spouse))
  }
`;

const getSpousesAndParents = (name) =>
  BASE_QUERY +
  `
  SELECT ?person ?spouse ?parent ?name ?spouseName ?parentName ?spouseParent
  WHERE {
    ?person a dbo:Person .
    ?person rdfs:label "${name}"@en.
    ?person rdfs:label ?name.
    ?person dbp:spouses ?spouse.
    ?person dbo:parent ?parent.
    ?spouse dbo:parent ?spouseParent.
    OPTIONAL { ?person dbp:spouses ?spouse. 
      ?spouse rdfs:label ?spouseName
    }
    OPTIONAL { ?person dbo:parent ?parent.
      ?parent rdfs:label ?parentName
    }
    FILTER (isURI(?spouse))
    FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
    FILTER (!bound(?spouseName) || langMatches( lang(?spouseName), "EN" ))
    FILTER (!bound(?parentName) || langMatches( lang(?parentName), "EN" ))
  }
`;

const getPersonByParentName = (name) =>
  BASE_QUERY +
  `
  SELECT ?person ?parent ?name
  WHERE {
    ?person a dbo:Person .
    ?person dbo:parent ?parent .
    ?person rdfs:label ?name
    FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
    { ?parent dbo:wikiPageRedirects/dbo:wikiPageRedirects* dbr:${replaceSpaces(name)} } 
    UNION 
    { ?person dbo:parent <http://dbpedia.org/resource/${replaceSpaces(name)}> . }
  }
`;

const replaceSpaces = (string) => string.replace(' ', '_');


const createPersonFamilyNode = (personData) => {
  const spouses = [];
  const children = [];
  const parents = [];
  personData.forEach((person) => {
    if (person.spouse && !spouses.map((s) => s.name).includes(person.spouseName.value)) {
      spouses.push({ name: person?.spouseName?.value, uri: person.spouse.value });
    }
    if (person.child && !children.map((c) => c.uri).includes(person.child?.value)) {
      children.push({ name: person?.childName?.value, uri: person.child?.value });
    }
    if (person.parent && !parents.map((c) => c.uri).includes(person.parent?.value)) {
      parents.push({ name: person?.parentName?.value, uri: person.parent?.value });
    }
  });
  return {
    name: personData[0]?.name.value,
    marraiges: spouses,
    parents: parents,
    children,
  };
};

const formatPersonNode = (personData) => {
  const spouses = [];
  const parents = [];
  personData.forEach((person) => {
    if (person.spouse && !spouses.map((s) => s.id).includes(person.spouse.value)) {
      console.log("person.value:: ", person)
      spouses.push({
          name: person?.spouseName?.value,
          id: person.spouse.value,
          extra: {
            id: person.spouse.value,
            parent1Id: null,
            parent2Id: null,
            spouseIds: [person.person.value]
          }
      });
    }
    if (person.parent && !parents.map((c) => c.id).includes(person.parent?.value)) {
      const isRoot = parents.length === 0;
      parents.push({ 
        name: person?.parentName?.value, 
        id: person.parent?.value,
        extra: {
          isRoot,
          parent1Id: null,
          parent2Id: null,
          spouseIds: [],
          id: person.parent?.value,
        }
      });
    }
  });
  if (parents.length === 2) {
    parents[0].extra.spouseIds.push(parents[1].id)
    parents[1].extra.spouseIds.push(parents[0].id)
  }
  const person = {
    name: personData[0]?.name.value,
    extra: {
      id: personData[0]?.person.value,
      parent1Id: parents[0]?.id,
      parent2Id: parents[1]?.id,
      spouseIds: spouses.map(s => s.id),
      areAllChildrenExpanded: false,
      areAllParentsExpanded: true,
      isFocused: true,
    }
  };
  return [...parents, person, ...spouses]
};

const formatChildrenNodes = data => {
  const children = data?.data?.results?.bindings
  const formattedChildren = []
  children.forEach((c) => {
    if (!formattedChildren.map(fc => fc?.extra?.id).includes(c.person.value)) {
      const parent1Id = c.parent.value
      let parent2Id = null
      children.some(c2 => {
        if (c2.person.value === c.person.value && c2.parent.value !== parent1Id) {
          parent2Id = c2.parent.value
          return true;
        }
        return false
      })
      formattedChildren.push({
        name: c.name.value,
        extra: {
          id: c.person.value,
          parent1Id,
          parent2Id,
          spouseIds: []
        }
      })
    }
    // if (c.parent && !parents.map((c) => c.id).includes(c.parent?.value)) {
    //   parents.push({ 
    //     name: c?.parentName?.value, 
    //     id: c.parent?.value,
    //     extra: {
    //       parent1Id: null,
    //       parent2Id: null,
    //       spouseIds: [],
    //       id: c.parent?.value,
    //     }
    //   });
    // }
  })
  return formattedChildren
}



const test1 = {
  name: 'Henry VIII',
  id: 'henryVIII',
  parent1Id: 'henryVII',
  parent2Id: 'elizabethOfYork',
  spouseIds: ['anneBoelyn', 'anneOfCleves', 'catherineHoward', 'catherineParr', 'catherineOfAragon', 'janeSeymour']
}

const test2 = {
  name: 'Henry VII',
  id: 'henryVII',
  parent1Id: null,
  parent2Id: null,
  spouseIds: ['elizabethOfYork']
}

const test4 = {
  name: 'Elizabeth of York',
  id: 'elizabethOfYork',
  parentId1: null,
  parentId2: null,
  spouseIds: ['henryVII']
}

const test3 = {
  name: 'Elizabeth I',
  id: 'elizabethI',
  spouseIds: [],
  parent1Id: 'anneBoelyn',
  parent2Id: 'henryVIII'
}

const test5 = {
  name: 'Edward VI',
  id: 'edwardVI',
  parent1Id: 'janeSeymour',
  parent2Id: 'henryVIII',
  spouseIds: []

}



export const createTreeFromList = list => {
  console.log({list})

  let root = null;
  const peopleData = {}
  list.forEach(e => {
    peopleData[e.extra.id] = e
  })
  Object.keys(peopleData).some(personKey => {
    if (peopleData[personKey].extra.isRoot) {
      root = peopleData[personKey]
      return true;
    }
    return false;
  })
  // find children of root
  const tree = recursivelyFindMarriagesAndChildren(root, peopleData)
  return tree;
}

const recursivelyFindMarriagesAndChildren = (currentPerson, allPeople) => {
  console.log({currentPerson})
  currentPerson.marriages = currentPerson.extra.spouseIds.map(spouseId => {
    const childrenIds = Object.keys(allPeople).filter(childId => {
      console.log({childId, personId: currentPerson.extra.id, spouseId})
      if (allPeople[childId].extra.parent1Id === currentPerson.extra.id) {
        if (allPeople[childId].extra.parent2Id === spouseId) {
          return true;
        }
      } else if (allPeople[childId].extra.parent2Id === currentPerson.extra.id) {
        if (allPeople[childId].extra.parent1Id === spouseId) {
          return true;
        }
      }
      return false;
    })
    console.log({childrenIds})
    return {
      spouse: {
        ...allPeople[spouseId]
      },
      children: childrenIds.map(childId => recursivelyFindMarriagesAndChildren(allPeople[childId], allPeople))
    }
  })
  console.log(currentPerson)
  return currentPerson
}

export const expandParents = extra => {
  const parent1Node = {}
  const parent2Node = {}
  if (extra.parents) {
    Object.assign(parent1Node, extra.parents[0])
    Object.assign(parent2Node, extra.parents[1])
  }
  return [parent1Node, parent2Node]
}

const testArr = [test1, test2, test4, test3, test5]

const test = `
   SELECT DISTINCT ?person ?name ?parent ?father
  WHERE {   
    ?person a dbo:Person.   
    ?person rdfs:label ?name.
FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
   {  ?person dbo:parent ?parent. 
     ?parent rdfs:label "Henry VIII"@en.}
UNION
{     ?person dbo:father ?father; rdfs:label "Henry VIII"@en }`;

const fatherTest = ` SELECT DISTINCT ?person ?name ?father
  WHERE {   
    ?person a dbo:Person.    
    ?person rdfs:label ?name.
FILTER (!bound(?name) || langMatches( lang(?name), "EN" ))
  ?person dbo:father ?father.
  ?father rdfs:label "Henry VIII"@en


}`;
