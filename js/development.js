
/*****************************************************************************
development2.js interface for 3d-force-graph
******************************************************************************/
var RENDER_QUICKER = false;
var RENDER_DEPTH = 50;
var RENDER_GALAXY = false;
var HIGH_CONTRAST = false;
var FONT_SIZE = 6;
var ROOT_HIGHLIGHT = true;
var REPULSION_STRENGTH = 5000
var IMMEDIATE_CHILDREN_HIGHLIGHT = false;
var ALL_CHILDREN_HIGHLIGHT = false;
var ALL_DIRECT_RELATIONS = false;
var PAUSE_MOTION = false;
var RENDER_DEPRECATED = false;
var RENDER_LABELS = false;
var RENDER_ULO_EDGE = false;
var RENDER_OTHER_PARENTS = false;
var GRAPH_DIMENSIONS = 3;
var GRAPH_LINK_WIDTH = 14;
var GRAPH_NODE_DEPTH = 500; // 100
var RENDER_SLICES = false;
var RENDER_RELATIONSHIPS = false;
var HOVER = false;
var CLUSTERS = false;
var EXIT_DEPTH = 26;
// Label text is cut after first word ending before this character limit.
const LABEL_MAX_LINE_LENGTH = 30;
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');
const LABEL_RE2 = new RegExp('(?<=owl:)(\\S+)', 'g');
const GRAPH_LINK_HIGHLIGHT_RADIUS = 15;
const GRAPH_VELOCITY_DECAY = 0.01;
const GRAPH_ALPHA_DECAY = 0.011;
const GRAPH_NODE_RADIUS = 5;
const GRAPH_COOLDOWN_TICKS = 50;
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/';
const CAMERA_DISTANCE = 170.0;
const RE_MD_TRIPLE = /\[(?<subject_label>[^\]]+)\]\((?<subject_uri>[^)]+)\) (?<relation>\w+) \[(?<object_label>[^\]]+)\]\((?<object_uri>[^)]+)\)/;
const RE_URL = /^https?:\/\/.+/i;
const RE_URL_ROOT = /^https?:\/\/[^#?]+/i;
const RE_NAMESPACE_URL = /(?<prefix>https?:\/\/.+[\/#](?<namespace>\w+)(?<separator>[_:]))(?<id>\w+)/;

/***************** DOM and APPEARANCE *****************/
const GRAPH_DOM_EL = $("#3d-graph");
const GRAPH_BACKGROUND_COLOR = "#000000";
SPRITE_MAP = new THREE.TextureLoader().load( "img/whitebox.png" );
SPRITE_MATERIAL = new THREE.SpriteMaterial( { map: SPRITE_MAP, color: 0x808080 , opacity : 0.5} );
SPRITE_FONT_COLOR = '#ffffff';

const SYNONYM_FIELD = ["synonyms",
  "oboInOwl:hasSynonym",
  "oboInOwl:hasExactSynonym",
  "oboInOwl:hasBroadSynonym",
  "oboInOwl:hasNarrowSynonym",
  "oboInOwl:hasRelatedSynonym"
]

function getJSON(path) {
  return fetch(path).then(response => response.text());
}

// Define a function to highlight specific words in label
const highlightWords = (text, wordsToHighlight) => {
  const regex = new RegExp(`(${wordsToHighlight.join('|')})`, 'gi');
  return text.replace(regex, '<span class="highlighted">$1</span>');
};

function printIndentedList(node, indent = 0) {
  const container = document.getElementById("node_list");
  const nodeElement = document.createElement("div");
  nodeElement.textContent = "-".repeat(indent) + " " + node.label;
  nodeElement.classList.add("node");
  const nodeColor = node.color;
  nodeElement.style.color = nodeColor;

  nodeElement.addEventListener("mouseover", () => {
    nodeElement.style.color = 'orangered';
    clicked = false;
    node.highlight = true;
    top.GRAPH.refresh()
  });
  var clicked = false;
  nodeElement.addEventListener("click", () => {
    clicked = true;
    setNodeReport(node)
    top.GRAPH.refresh()
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  nodeElement.addEventListener("mouseout", () => {
    nodeElement.style.color = nodeColor; // Reset to the original color
    node.highlight = clicked;
    top.GRAPH.refresh()
  });
  container.appendChild(nodeElement);
  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      printIndentedList(top.dataLookup[node.children[i]], indent + 2);
    }
  }
}

//var availableColors = Object.values(relationshipColors);
var availableColorsHighContrast = Object.values(highContrastRelationshipColors);


function getRandomAvailableColor() {
  // Pick a random color from the available colors and remove it
  // var colours = HIGH_CONTRAST ? availableColorsHighContrast : availableColors
  var colours = availableColorsHighContrast
  const randomIndex = Math.floor(Math.random() * colours.length);
  const colour = colours.splice(randomIndex, 1)[0];
  return colour;
}




const colorMap = {}; // To store generated colors for object properties
function processGraphWithRestrictions(node,links) {


  if (!node) {
    return;
  }

  if (node.restrictionTriples && node.restrictionTriples.length > 0) {
    for (const restrictionTriple of node.restrictionTriples) {

      var label = restrictionTriple.onProperty.match(LABEL_RE2);
      if(restrictionTriple.onPropertyLabel)
      {
        label = restrictionTriple.onPropertyLabel;
      }

      // Check if a color has already been generated for this object property
      if (!colorMap[label]) {
        colorMap[label] = getRandomAvailableColor(); // Generate a random color
      }

      if (restrictionTriple.allValuesFrom) {



        if(node != undefined && top.dataLookup[restrictionTriple.allValuesFrom] != undefined)
        {
          // Create a new link from the current node to the someValuesOf node
          var link = {
            source: node,
            target: top.dataLookup[restrictionTriple.allValuesFrom],
            label:  node.label +" ⊑ ∀" + label+ "." + top.dataLookup[restrictionTriple.allValuesFrom].label   ,
            //each source onProperty's only target
            highlight_color: colorMap[label], // Hex or string
            width: 30,
            other: label
            //other: "Each " + node.label + " is " + restrictionTriple.onProperty.match(LABEL_RE2)+ " only " + top.dataLookup[restrictionTriple.allValuesFrom].label
          };
          // Check if the source and target nodes are the same
          if (link.source !== link.target) {
            links.push(link);
          }
        }


      }
      if (restrictionTriple.someValuesFrom) {

        // Create a new link from the current node to the someValuesOf node
        if(node != undefined && top.dataLookup[restrictionTriple.someValuesFrom] != undefined) {
          var link = {
            source: node,
            target: top.dataLookup[restrictionTriple.someValuesFrom],
            label: node.label +" ⊑ ∃" + label + "." + top.dataLookup[restrictionTriple.someValuesFrom].label   ,
            //each source onProperty's some target
            highlight_color: colorMap[label], // Hex or string
            width: 5,
            other: label
            //other: "Each " + node.label + " is " + restrictionTriple.onProperty.match(LABEL_RE2)+ " some " + top.dataLookup[restrictionTriple.someValuesFrom].label
          };
          // Check if the source and target nodes are the same
          if (link.source !== link.target) {
            links.push(link);
          }
        }

      }
    }
  }
}

function load_graph() {

  if (top.RAW_DATA) {

    // Rendering of all but last pass skips labels and fancy polygons.
    top.RENDER_QUICKER = true;
    top.RENDER_LABELS = true;

    $(document.body).css({'cursor': 'wait'});

    setNodeReport(); // Clear out sidebar info

    const cache_url = $("select#ontology option").filter(':selected')[0].dataset.cache

    var request = new XMLHttpRequest();
    request.open('GET', cache_url, false);
    request.send(null);
    let snapshot = JSON.parse(request.responseText);

    top.BUILT_DATA = init_ontofetch_data(top.RAW_DATA, cache=snapshot['nodes']);
    top.MAX_DEPTH = top.BUILT_DATA.nodes[top.BUILT_DATA.nodes.length-1].depth;
    init_search(top.BUILT_DATA);
    let nodes=top.BUILT_DATA.nodes;
    let links=top.BUILT_DATA.links;
    //console.log('Indented List of Nodes:');
    const container = document.getElementById("node_list");
    container.textContent = "";
    printIndentedList(nodes[0]);

    if(RENDER_RELATIONSHIPS) {
      for (let i = 0; i < nodes.length; i++) {
      processGraphWithRestrictions(nodes[i], links)
      }
  }

    top.GRAPH = init(load = true, nodes, links);
    //There were no variables/way to access the scene and renderer objects so I added these in (mainly to manipulate the light)
    //I did attempt to manipulate the fog variable but was unsuccessful
    let scene = top.GRAPH.scene();
    let renderer = top.GRAPH.renderer();
// Assuming you have a camera object in the graph (e.g., graph.camera() or graph.camera.camera).
    const camera = top.GRAPH.camera();

    // Set the up vector of the camera to ensure true north stays up.
    camera.up.set(0, 1, 0); // Use (0, 0, 1) for the Z-up convention.


    // Essentially the current light source was coming from behind the graph and so the nodes appeared desaturated and
    // dark when I changed their material to a material that reflected the light.
    // In order to fix this, a new light source was added that is directed at the front of the graph, illuminating the nodes
    scene.remove(...scene.children.filter(child => child instanceof THREE.Light));

    // Add a new light source
    const light = new THREE.DirectionalLight(0xFFFFFF, 0.5); //TODO why directional. look at other options
    light.position.set(0,-4000, 2000); // Set the position of the light
    scene.add(light);


    top.dataLookup = Object.fromEntries(nodes.map(e => [e.id, e]))

    $(document.body).css({'cursor' : 'default'});
    $("#download_button").css({'visibility': 'visible'})
    $("#rerender_button").css({'visibility': 'visible'})
    $("#center_graph").css({'visibility': 'visible'})
    $("#clear_highlight").css({'visibility': 'visible'})
    $("#pause_motion").css({'visibility': 'visible'})

    if (RENDER_RELATIONSHIPS) {
      $("#render_layer_depth").prop('disabled', true);
    } else {
      $("#render_layer_depth").prop('disabled', false);
    }
  }
}

function clearHighlight()
{
  HOVER = false;
  top.BUILT_DATA.nodes.forEach(node => (node.highlight = false));
  top.BUILT_DATA.links.forEach(link => (link.highlight = false));
  top.GRAPH.nodeColor(node => node.color);
  top.GRAPH.linkColor(link => link.highlight_color ? link.highlight_color : link.source.color);
  top.GRAPH.linkDirectionalParticleColor(() => null);
  top.GRAPH.linkDirectionalParticleWidth(() => 10);
  top.GRAPH.refresh()
  //centerGraph()
}


function centerGraph(){
  top.GRAPH.cameraPosition(
      { x: 0, y: 0, z: CAMERA_DISTANCE * top.BUILT_DATA.nodes.length },
      { x: 0, y: 0, z: 0 },
      1000
  );
  top.GRAPH.camera().up.set(0, 1, 0);
}

function load_uploaded_graph() {

  // Rendering of all but last pass skips labels and fancy polygons.
  top.RENDER_QUICKER = true;
  top.RENDER_LABELS = true;

  $(document.body).css({'cursor': 'wait'});

  setNodeReport(); // Clear out sidebar info

  // ISSUE: top.METADATA_JSON is never adjusted???!??! -> not sure what this means
  top.BUILT_DATA = init_ontofetch_data(top.METADATA_JSON);

  top.MAX_DEPTH = top.BUILT_DATA.nodes[top.BUILT_DATA.nodes.length-1].depth;
  init_search(top.BUILT_DATA);
  let nodes=top.NODES_JSON;
  let links=[];
  top.GRAPH = init(load=true, nodes, links);

  top.dataLookup = Object.fromEntries(nodes.map(e => [e.id, e]))

  $(document.body).css({'cursor' : 'default'});
  $("#download_button").css({'visibility': 'visible'})
}

var uniqueZValues = new Set();

/*
  Main method for loading a new data file and rendering a graph of it.

*/
function do_graph() {

  if (top.RAW_DATA) {

    // Rendering of all but last pass skips labels and fancy polygons.
    top.RENDER_QUICKER = true;
    top.RENDER_LABELS = true;
    top.NEW_NODES = []; // global so depth_iterate can see it
    top.ITERATE = 1;

    $(document.body).css({'cursor' : 'wait'});

    setNodeReport(); // Clear out sidebar info

    // Usual case for GEEM ontofetch.py ontology term specification table:
    // This creates top.BUILT_DATA
    top.BUILT_DATA = init_ontofetch_data(top.RAW_DATA);
    $("#status").html(top.BUILT_DATA.nodes.length + " terms");
    top.MAX_DEPTH = top.BUILT_DATA.nodes[top.BUILT_DATA.nodes.length-1].depth;
    init_search(top.BUILT_DATA);

    top.GRAPH = init(load=false);

    $("#download_button").css({'visibility': 'visible'})
    $("#rerender_button").css({'visibility': 'visible'})
    $("#center_graph_button").css({'visibility': 'visible'})
  }
};



function init(load=false, nodes=null, links=null) {

  if (top.GRAPH) {
    // See bottom of https://github.com/vasturiano/3d-force-graph/issues/302
    // See bottom of https://github.com/vasturiano/3d-force-graph/issues/433
    top.GRAPH._destructor()
  }





  // controlType is  'fly', 'orbit' or 'trackball'
  if (load) {

     const graph =  ForceGraph3D({controlType: 'trackball'})(GRAPH_DOM_EL[0])
    .graphData({nodes: nodes, links: links})
         .enableNodeDrag(false) // removed this line to allow users to move around nodes so they could navigate the graph better
         .backgroundColor(HIGH_CONTRAST? '#FFFFFF' : '#101020') // an extremely dark purple. More analytical and calm, less daunting than the original
         .width(850)
         .linkWidth(function(link) {
           return link.highlight ? GRAPH_LINK_HIGHLIGHT_RADIUS : link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH
         })


         //I'm 100% this does nothing. The render_node() method cancels out any parameters of the node set here.
         //Basically anything to do with the node would have to be somehow passed into that method to make the change
         //.nodeOpacity(0.9)


         //added directional particles. One of our most successful channels is motion.
         .linkDirectionalParticles(link => PAUSE_MOTION? 0 : RENDER_RELATIONSHIPS? link.highlight_color == null ? 0 : 3 : 3)
         .linkDirectionalParticleWidth(10)
         //Speed slow enough to be soothing
         .linkDirectionalParticleSpeed(0.006)
         //Want to focus on nodes not necessarily the links, link opacity reduced
         .linkOpacity(0.3)
         .linkColor(function(link){
           var target = link.target;

           if (link.highlight_color)
             return link.highlight_color;

           // only happens on post-first-render, so link.target established as object
           if (top.RENDER_ULO_EDGE === true) {

             var group = top.dataLookup[link.target.group_id];
             if (group && group.color) {
               return group.color;
             };
           }

           //link.target itself is actually string id on first pass.
           if (!link.target.prefix) {
             // convert to object
             target = top.dataLookup[link.target];
           }
           // used for ULO as ontology color when not rendering by ULO branch color
           if (target.prefix == 'BFO') {
             return getOntologyColor(top.dataLookup[target.id]);
           }
           return target.color;
         })
         .linkLabel(link => link.label ? `<div>${link.other}<br/><span class="tooltip-id">${link.label}</span><br/></div>` : null)
         .linkCurvature(link => link.highlight_color? 0.2 : 0)
         .nodeRelSize(node => node.highlight ? 18 : 4 ) // 4 is default
         .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
         .onLinkClick(link => {
           setNodeReport(link.target)
           link.target.highlight = true;
           graph.refresh()

         })
         .onNodeClick(node => {
           setNodeReport(node);
           node.highlight = true;
           graph.refresh()
         })
         .nodeThreeObject(node => render_node(node,HOVER))
         .onEngineStop(stuff => {
           //CODE TO DISPLAY PLANES FOR EACH LAYER
           // //Iterate through all nodes to get unique z-values
           // const allNodes = top.BUILT_DATA.nodes;
           // allNodes.forEach(node => {
           //   uniqueZValues.add(node.y);
           //   console.log('Unique Z-value:', node.y);
           // });
           //
           // // Perform actions at each unique z-value
           // uniqueZValues.forEach(z => {
           //   // Your custom actions go here for each unique z-value (e.g., log the value)
           //   var planeGeometry = new THREE.CubeGeometry(5000, 0,5000 );
           //   var planeMaterial = new THREE.MeshStandardMaterial({ color: 'white', fog: false, opacity: 0.05, transparent: true, depthWrite : false });
           //   var plane = new THREE.Mesh(planeGeometry, planeMaterial);
           //   plane.position.set(0, z, 0);
           //   scene.add(plane);
           //
           //
           //   // If you need to perform specific actions on nodes at this z-value, you can filter the nodes accordingly
           //   const nodesAtZValue = allNodes.filter(node => node.z === z);
           //   // Perform actions on nodesAtZValue...
           // });


         });


    //sets the amount of repulsion (-) between the nodes. Ensures the nodes are adequately spaced out
    graph.d3Force('charge').strength(-(RENDER_RELATIONSHIPS? REPULSION_STRENGTH*2 : REPULSION_STRENGTH));


    if(!RENDER_RELATIONSHIPS)
    {
        graph.dagMode('td') //decided to leverage the DAG layout function of 3D force graph that arranges the nodes in a clearer. more structured manner where nodes are organized by layer
        graph.dagLevelDistance(GRAPH_NODE_DEPTH) //set the length of the links in the graph (chosen through experimentation)
       graph.nodeLabel(node => `<div>${node.label}<br/><span class="tooltip-id">${node.id}</span><br/><span class="tooltip-id">${"Number of Subtypes: " + node.children.length}</span></div>`)

    }


    if(RENDER_RELATIONSHIPS)
    {
      graph.nodeLabel(node => {
        var relations = "<br/>"
        links.forEach(link => {
          if(link.source == node || link.target == node)
          if(link.label) {
            relations += link.label + "</br>"
          }
        });

        relations = highlightWords(relations, [node.label]);

        return `<div>${node.label}<br/><span class="tooltip-id">${node.id}</span><br/><span class="tooltip-id">${"Number of Subtypes: " + node.children.length}</span><span class="tooltip-id">${relations}</span></div>`
      })

    }



    //variable passed into render_node() to indicate that the user is hovering on a node
    HOVER = false;
    //this mainly controls the colouring of the links and directional particles since the nodes can only be recoloured in the render_node() method

    var dullOut = '#555555'
    if(HIGH_CONTRAST)
    {
      dullOut = '#cbcbcb'
    }


    //this function recursively highlights all parents (and links connecting) of a node up to the root
    function highlightParents(node) {

      const highlightColor = '#FF7000';
      if (node) {

        //get the parent of a given node
        const parentNode = top.dataLookup[node.parent_id];
        //if no parent it is the root and no highlighting occurs (should it though)
        if (parentNode) {
          node.highlight = true;
          parentNode.highlight = true;
          links.forEach(link => {
            //highlight link that connects node and its parent
            if(link.target === node && link.source === parentNode) {
              link.highlight = true;
                link.indicator_colour = highlightColor

            }
          });
          //only set properties of the link. Node colouring happens in render_node() using the node.highlight property
          //the links that are highlighted turn orange and the rest turn dark grey to fade into background
          graph.linkColor(link => (link.highlight ? link.highlight_color ? link.highlight_color : link.indicator_colour : dullOut));
          //same with the particles
          graph.linkDirectionalParticleColor(link => (link.highlight ? link.highlight_color : dullOut));
          //the links that are highlighted get a faster particle speed and larger particle width.
          //the particles also go in the opposite direction (towards root)
          graph.linkDirectionalParticleWidth(link => (link.highlight ? 10 : 10));
          graph.linkDirectionalParticleSpeed(link => (link.highlight ? 0.006 : 0.006));

          // Recursively highlight parent nodes up to the root
          if(ROOT_HIGHLIGHT)
          {
            highlightParents(parentNode);
          }


          graph.refresh(); // Call refresh to update the graph with the new colors
        }
      } else {
        // No node is being hovered, remove the highlight from all nodes and links
        HOVER = false;
        nodes.forEach(node => (node.highlight = false));
        links.forEach(link => (link.highlight = false));
        graph.nodeColor(node => node.color);
        graph.linkColor(link => link.highlight_color ? link.highlight_color : link.source.color);
        graph.linkDirectionalParticleColor(() => null);
        graph.linkDirectionalParticleWidth(() => 10);
        graph.refresh(); // Call refresh to update the graph with the new colors
      }
    }


    function highlightChildren(node) {
      const highlightColor = HIGH_CONTRAST? '#c79a02' : 'yellow';
      if (node) {
        node.highlight = true;
        const children = node.children || []; // Assuming node.children is an array of child nodes


        children.forEach(child => {
          console.log(top.dataLookup[child])
          child = top.dataLookup[child]

         // child = top.dataLookup[child.id];
          child.highlight = true;
          const link = links.find(link => link.source === node && link.target === child);
          if (link) {
            link.indicator_colour = HIGH_CONTRAST? '#c79a02' : 'yellow'
            link.highlight = true;
          }

          // Recursively highlight child nodes
          if(ALL_CHILDREN_HIGHLIGHT)
          {
            highlightChildren(child);
          }

        });

        graph.linkColor(link => (link.highlight ? link.highlight_color ? link.highlight_color : link.indicator_colour : dullOut));
        graph.linkDirectionalParticleColor(link => (link.highlight ? link.highlight_color : dullOut));
        graph.linkDirectionalParticleWidth(link => (link.highlight ? 10 : 10));
        graph.linkDirectionalParticleSpeed(link => (link.highlight ? 0.006 : 0.006));
        graph.refresh(); // Call refresh to update the graph with the new colors
      } else {
        // No node is being hovered, remove the highlight from all nodes and links
        HOVER = false;
        nodes.forEach(node => (node.highlight = false));
        links.forEach(link => (link.highlight = false));
        graph.nodeColor(node => node.color);
        graph.linkColor(link => link.highlight_color ? link.highlight_color : link.source.color);
        graph.linkDirectionalParticleColor(() => null);
        graph.linkDirectionalParticleWidth(() => 10);
        graph.refresh(); // Call refresh to update the graph with the new colors
      }
    }

    function highlightImmediate(node) {
      if (node) {
        node.highlight = true;
        const linksWhereNodeIsSource = links.filter(link => link.source === node);
        linksWhereNodeIsSource.forEach(link => {
          link.highlight = true;
          link.indicator_colour = HIGH_CONTRAST? '#c79a02' : 'yellow'
          link.target.highlight = true;
        });

        const linksWhereNodeIsTarget = links.filter(link => link.target === node);
        linksWhereNodeIsTarget.forEach(link => {
          link.highlight = true;
          link.indicator_colour = '#FF7000'
          link.source.highlight = true;

        });

        graph.linkColor(link => (link.highlight ? link.highlight_color ? link.highlight_color : link.indicator_colour : dullOut));
        graph.linkDirectionalParticleColor(link => (link.highlight ? link.highlight_color : dullOut));
        graph.linkDirectionalParticleWidth(link => (link.highlight ? 10 : 10));
        graph.linkDirectionalParticleSpeed(link => (link.highlight ? 0.006 : 0.006));
        graph.refresh(); // Call refresh to update the graph with the new colors
      } else {
        // No node is being hovered, remove the highlight from all nodes and links
        HOVER = false;
        nodes.forEach(node => (node.highlight = false));
        links.forEach(link => (link.highlight = false));
        graph.nodeColor(node => node.color);
        graph.linkColor(link => link.highlight_color ? link.highlight_color : link.source.color);
        graph.linkDirectionalParticleColor(() => null);
        graph.linkDirectionalParticleWidth(() => 10);
        graph.refresh(); // Call refresh to update the graph with the new colors
      }
    }



    graph.onNodeRightClick(node => {
      HOVER = true;
      if(ROOT_HIGHLIGHT)
      {
        highlightParents(node);
      }

      if(ALL_CHILDREN_HIGHLIGHT || IMMEDIATE_CHILDREN_HIGHLIGHT)
      {
        highlightChildren(node);
      }

      if(ALL_DIRECT_RELATIONS)
      {
        highlightImmediate(node);
      }

    });

    graph.onBackgroundRightClick(event => {
          const clickedElement = event.target;
          HOVER = false;
          nodes.forEach(node => (node.highlight = false));
          links.forEach(link => (link.highlight = false));
          graph.nodeColor(node => node.color);
          graph.linkColor(link => link.highlight_color ? link.highlight_color : link.source.color);
          graph.linkDirectionalParticleColor(() => null);
          graph.linkDirectionalParticleWidth(() => 10);
          graph.refresh()
          top.GRAPH.camera().lookAt(
          { x: 0, y: 0, z: 0 }

      );
        }

    )


    //set camera to fit the entire graph based on the number of nodes
    graph.cameraPosition({ x: nodes[1].x, y: nodes[1].y, z: (CAMERA_DISTANCE*nodes.length) }, { x: 0, y: 0, z: 0 })
    // graph.d3Force('link').distance(100000);
    // graph.numDimensions(3);

    return graph;
  }
//no idea what this else statement does
  else {
    return ForceGraph3D({controlType: 'trackball'})(GRAPH_DOM_EL[0])

    // Using dfault D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3')
    .enableNodeDrag(false) // Stops frozen nodes from getting moved around by user
    .width(GRAPH_DOM_EL.width())
    .warmupTicks(0)
    //.cooldownTime(GRAPH_COOLDOWN_TIME)
    .cooldownTicks(GRAPH_COOLDOWN_TICKS)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)

    // Getter/setter for the simulation intensity decay parameter, only
    // applicable if using the d3 simulation engine.
    .d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228

    // Getter/setter for the nodes' velocity decay that simulates the medium
    // resistance, only applicable if using the d3 simulation engine.
    .d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4
    //.linkWidth(link => link === highlightLink ? 4 : 1)
    .linkWidth(function(link) {
      //
      return link.highlight ? GRAPH_LINK_HIGHLIGHT_RADIUS : link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH
    })

    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/
    // It would be great if we could make it dashed instead
    // First mark a link by its highlight if any;
    // then by group's color if top.RENDER_ULO_EDGE;
    // then by color.

    // PROBLEM: sometimes target is node, sometimes string.
    // CAREFUL! THIS ITERATES AND SEEMS TO CHANGE NODE source / target
    // from id to object.
    .linkColor(function(link) {
      var target = link.target;

      if (link.highlight_color)
        return link.highlight_color;

      // only happens on post-first-render, so link.target established as object
      if (top.RENDER_ULO_EDGE === true) {

        var group = top.dataLookup[link.target.group_id];
        if (group && group.color) {
          return group.color;
        };
      }

      //link.target itself is actually string id on first pass.
      if (!link.target.prefix) {
        // convert to object
        target = top.dataLookup[link.target];
      }

      // used for ULO as ontology color when not rendering by ULO branch color
      if (target.prefix == 'BFO') {
        return getOntologyColor(top.dataLookup[target.id]);
      }
      return target.color;
    })

    .linkResolution(3) // 3 sided, i.e. triangular beam
    .linkOpacity(1)
    // Text shown on mouseover.  WAS node.label
    .nodeLabel(node => `<div>${node['rdfs:label']}<br/><span class="tooltip-id">${node.id}</span></div>`)
    //.nodeAutoColorBy('color')
    //.nodeColor(node => node.highlight ? 'color) // Note: this triggers refresh on each animation cycle
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    //.nodeColor(node => node.highlight ? '#F00' : node.color )
    // Not doing anything...
    .nodeRelSize(node => node.highlight ? 18 : 4 ) // 4 is default
    .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {setNodeReport(link.target)})
    .onNodeClick(node => setNodeReport(node))
    .nodeThreeObject(node => render_node(node))
    // Do this only for 3d iterated version
    // Running on each iteration?
    .onEngineStop(stuff => {
      depth_iterate();
    })
  }
}

//depth iterate used to (previously) add the nodes at a given depth, layer by layer. This included the fixing of
//the positions of nodes. So, in order to allow the 3D force graph to work and automaticlaly space out nodes accoridng to
//the rules specified above
function depth_iterate() {
  if (top.ITERATE > top.EXIT_DEPTH) {
    if (top.GRAPH) {
      top.GRAPH.pauseAnimation();
    }
    return;
  }
  if (top.ITERATE < top.MAX_DEPTH) {
    const filteredNodes = top.BUILT_DATA.nodes.filter(node => node.depth <= top.ITERATE);
    const filteredLinks = top.BUILT_DATA.links.filter(link => {
      const targetNode = top.dataLookup[link.target];
      return targetNode && targetNode.depth <= top.ITERATE;
    });
    $("#status").html(
        'Rendering ' +
        filteredNodes.length +
        ' of ' +
        top.BUILT_DATA.nodes.length +
        ' terms, depth ' +
        top.ITERATE
    );
    top.GRAPH.graphData({
      nodes: filteredNodes,
      links: filteredLinks,
    });
    top.ITERATE++;
  } else {
    top.GRAPH.cooldownTicks(GRAPH_COOLDOWN_TICKS);
    $("#status").html(
        'Rendering ' +
        top.BUILT_DATA.nodes.length +
        ' of ' +
        top.BUILT_DATA.nodes.length +
        ' terms, depth >= ' +
        (top.ITERATE || 1)
    );
    top.GRAPH.graphData({
      nodes: top.BUILT_DATA.nodes,
      links: top.BUILT_DATA.links,
    });
    top.ITERATE = top.EXIT_DEPTH + 1;
    return;
  }
}
function depth_iterate_exit() {

  // Final step: Flip into requested (2 or 3) dimensions, with parents fixed by their 2d (x, y)
  console.log(' Ending with' + GRAPH_DIMENSIONS + ',' + top.ITERATE + ',' + top.MAX_DEPTH + top.RENDER_DEPTH)

  // Restores these settings after quick positional render without them.
  var flag = $("#render_labels:checked").length == 1

  // Issue: with latest 3d-force-graph this flag is only causing
  // labels of last iteration to be drawn. Graph as a whole isn't being
  // redrawn on exit.
  if (top.RENDER_LABELS != flag) {
    top.RENDER_LABELS = flag
  }
  var flag = $("#render_quicker:checked").length == 1
  if (top.RENDER_QUICKER != flag) {
    top.RENDER_QUICKER = flag
  }
  top.GRAPH.numDimensions(GRAPH_DIMENSIONS)


  // z coordinate reset to standard hierarchy
  for (item in top.BUILT_DATA.nodes) {
    node = top.BUILT_DATA.nodes[item]
    // This reduces crowdedness of labelling, otherwise labels are all on
    // same plane.
    // if (GRAPH_DIMENSIONS == 2 && (node.id in top.layout)) {
    if (GRAPH_DIMENSIONS == 2) {
      node.fz = 0  //lookup_2d_z(node)
    }
    else {
      const z_randomizer = Math.random() * 20 - 10
      node.fz = node_depth(node) + z_randomizer
    }

    // No need to have this node participate in force directed graph now.
    if (node.children.length == 0) {
      node.fy = node.y;
      node.fx = node.x;
    }

    const parent = top.dataLookup[node.parent_id];
    if (parent && RENDER_SLICES && !(node.id in top.layout))
      node.fx = parent.fx;

  }
  // don't make below var newNodes / var newLinks?
  var newNodes = top.BUILT_DATA.nodes.filter(n => n.depth.within(top.ITERATE, top.RENDER_DEPTH))

  // Return link if target is within depth, or link is one of the "other, i.e. secondary links.
  var newLinks = top.BUILT_DATA.links.filter(
    l => top.dataLookup[l.target] && ((RENDER_OTHER_PARENTS && l.other === true)
      || (l.other === false && top.dataLookup[l.target].depth.within(top.ITERATE, top.RENDER_DEPTH))
    )
  );
  /*
  // For some reason, can't code abovce as  .filter(l => function(l){...}) ?
  var newLinks = top.BUILT_DATA.links.filter( l => function(l){
    target = top.dataLookup[l.target]
    // Return link if target is within depth, or link is one of the "other, i.e. secondary links.
    //
    return (RENDER_OTHER_PARENTS && l.other ===true) || ((l.other === false) && target.depth >= top.ITERATE && target.depth <= top.RENDER_DEPTH)
  });
  */

  // Fetches existing tuple of nodes and links
  const { nodes, links } = top.GRAPH.graphData();

  const new_length = nodes.length + newNodes.length
  $("#status").html('Rendering ' + new_length + ' of ' + top.BUILT_DATA.nodes.length + " terms, depth >= " + (top.ITERATE || 1));

  //top.GRAPH.cooldownTicks(new_length)  // GRAPH_COOLDOWN_TICKS * 3

  top.GRAPH.graphData({
    nodes: nodes.concat(newNodes),
    links: links.concat(newLinks)
  });

  // Ensures no more iterations
  top.ITERATE = top.EXIT_DEPTH+1;


  return; // End of it all.

}

function lookup_2d_z(node) {
  // apply this to parent, not to a node that is being calculated.
  var parent = top.dataLookup[node.parent_id];
  // ISSUE: fixing node to parent z is causing pythagorean distance in force directed graph to screw up,
  // causing points to contract to centre.
  if (parent) {
    console.log ("z", parent.z)
    return (parent.z - 10.0)
  }
  return node_depth(node)
}

Number.prototype.within = function(a, b) {
  var min = Math.min.apply(Math, [a, b]),
      max = Math.max.apply(Math, [a, b]);
  return this >= min && this <= max;
};



/* Add to do_graph() to navigate to a particular node
  // Navigate to root BFO node if there is one. Slight delay to enable
  // engine to create reference points.  Ideally event for this.
  if('BFO:0000001' in top.dataLookup) {
    setTimeout(function(){
      setNodeReport(top.dataLookup['BFO:0000001'])
    }, 2000)
  }
  */