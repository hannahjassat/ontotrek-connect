
/*****************************************************************************
common.js interface for 3d-force-graph

Functions to drive 3d-force-graph that are core.  More experimental stuff is
in other files like development.js .  These files are loaded in addition to
/js/bundle.js , which is created by node.js's browserify command.

Work with rdflib.js is documented via:
  https://solid.inrupt.com/docs/manipulating-ld-with-rdflib

This program can work directly off of .owl files in RDF/XML format. They can
be stored locally in the /data folder, or provided in a URL

_____________________________
Node.js NPM Management:

  To update 3d-force-graph run this in ontotrek root folder:
  
  > npm update 

  To update /js/bundle.js which needs latest 3d-force-graph, need to run 
  browserify.org's "browserify" command. To load it (may need sudo su):

  > npm install -g browserify
  > npm install uniq 

  Then in /js folder, regenerate bundle.js based on super-basic index.js

  > browserify index.js -o bundle.js

  Now the catch is the latest 3d-force-graph isn't browserifying due to some
  ES5 / 6 browserify issue.

  So retrieve a copy of 3d-force-graph.min.js directly from /unpkg.com/3d-force-graph

_____________________________
Development notes:

Graph parameters
  https://github.com/vasturiano/3d-force-graph

Force node position with:
  https://github.com/vasturiano/3d-force-graph/issues/90

Also see link hovering:
  https://github.com/vasturiano/3d-force-graph/issues/14

See forcing link size:
  https://github.com/d3/d3-force#forceLink

_____________________________
The Ontology Json File Format

A legacy JSON format data file can also be supplied in /data/ is generated 
by ontofetch.py from an OWL ontology file.  This is being phased out.

Example fetchs of ontology using "ontofetch.py" program. 
It returns a flat json list of terms branching from given root (defaults 
to owl:Entity). No option currently to retrieve all terms - terms must have
a single root.

  python ontofetch.py http://purl.obolibrary.org/obo/bfo/2.0/bfo.owl -o data -r http://purl.obolibrary.org/obo/BFO_0000001
  python ontofetch.py https://raw.githubusercontent.com/obi-ontology/obi/master/obi.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/DiseaseOntology/HumanDiseaseOntology/master/src/ontology/doid-merged.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/master/hp.owl -o data -r http://purl.obolibrary.org/obo/UPHENO_0001001
  python ontofetch.py https://raw.githubusercontent.com/AgriculturalSemantics/agro/master/agro.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/arpcard/aro/master/aro.owl -o test -r http://purl.obolibrary.org/obo/ARO_1000001
  python ontofetch.py https://raw.githubusercontent.com/EBISPOT/ancestro/master/hancestro.owl -o test -r http://purl.obolibrary.org/obo/HANCESTRO_0004
  python ontofetch.py https://raw.githubusercontent.com/pato-ontology/pato/master/pato.owl -o test -r http://purl.obolibrary.org/obo/PATO_0000001
  python ontofetch.py https://raw.githubusercontent.com/PopulationAndCommunityOntology/pco/master/pco.owl -o test

  Note this misses 2 branches:
  python ontofetch.py https://raw.githubusercontent.com/Planteome/plant-ontology/master/po.owl -o test -r http://purl.obolibrary.org/obo/PO_0025131
  python ontofetch.py https://raw.githubusercontent.com/CLO-ontology/CLO/master/src/ontology/clo_merged.owl -o test -r http://purl.obolibrary.org/obo/BFO_0000001
  python ontofetch.py http://purl.obolibrary.org/obo/cmo.owl -o test -r http://purl.obolibrary.org/obo/CMO_0000000
  python ontofetch.py https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.owl -o test -r http://purl.obolibrary.org/obo/BFO_0000001
  python ~/GitHub/GEEM/scripts/ontofetch.py https://raw.githubusercontent.com/biobanking/biobanking/master/ontology/obib.owl

  python3 ../ontofetch/ontofetch.py http://www.onto-med.de/ontologies/gfo.owl -o data/ -r http://www.onto-med.de/ontologies/gfo.owl#Entity,http://www.onto-med.de/ontologies/gfo.owl#Material_persistant

  python3 ../ontofetch/ontofetch.py http://purl.obolibrary.org/obo/ma.owl -o data/ -r http://purl.obolibrary.org/obo/MA_0000001

  PROBLEM CASE: Many terms, little class/subclass structure
  python3 ../ontofetch/ontofetch.py https://raw.githubusercontent.com/obophenotype/mouse-anatomy-ontology/master/emapa.owl -o data/ -r http://purl.obolibrary.org/obo/EMAPA_0

******************************************************************************/

init_search();
init_interface();

   
$(document).foundation()

// Try this in case URL had path, before chosen() is applied 
var auto_load = document.location.href.indexOf('?ontology=')
if (auto_load) {
    var choice = document.location.href.substr(auto_load+10).toLowerCase()
    $("#ontology").children(`option[value="data/${choice}.json"]`).attr("selected","selected");
    $("#ontology").trigger('change')
}

// Saves an object as a JSON
function save(blob, filename) {
  var link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Helper function to save nodes/links as JSON
function saveString(text, filename) {

  save(new Blob([text], { type: 'text/plain' }), filename);

}

var ONTOLOGY;

function init_interface() {
  // Selection list of all node labels allows user to zoom in on one
  $("#ontology")
    .on('change', function(item){
      ONTOLOGY = this.value
      if (this.value > '') {
        const cache_url = $("select#ontology option").filter(':selected')[0].dataset.cache;

        var request = new XMLHttpRequest();
        request.open('GET', cache_url, false);
        request.send();
        if (request.status == 404) {
          load_data(this.value, do_graph);
        }
        else {
          load_data(this.value, load_graph);
        }
      }
    })

  $("#ontology").chosen({placeholder_text_single: 'Select an item ...'})

  // Allows user to re-render the ontology instead of loading up a snapshot
  $("#rerender_button").on('click', function(item){
    do_graph();
  })

  $("#center_graph").on('click', function(item){
    centerGraph()
  })

  $("#pause_motion").on('click', function(item){
    PAUSE_MOTION = !PAUSE_MOTION; // Toggle the value

    if (PAUSE_MOTION) {
      $(this).text("Resume Animation");
    } else {
      $(this).text("Pause Animation");
    }

    top.GRAPH.refresh();
  })

  $("#clear_highlight").on('click', function(item){
    clearHighlight()
  })

  $("#show_clusters").on('click', function(item){
    CLUSTERS = this.checked;
    top.GRAPH.refresh()
  })



  // Allows the user to download JSONs for the nodes and links of the ontology
  $("#download_button").on('click', function(item){
    const { nodes, links } = top.GRAPH.graphData();
    const nodes_out = nodes.map(({id, x, y, z}) => ({id, x, y, z}));

    for (i = 0; i < nodes_out.length; i++) {
      nodes_out[i].x = parseInt(nodes_out[i].x, 10);
      nodes_out[i].y = parseInt(nodes_out[i].y, 10);
      nodes_out[i].z = parseInt(nodes_out[i].z, 10);
    }

    const out_obj = {
      'nodes': nodes_out,
      // 'meta': top.RAW_DATA
    };
    saveString(JSON.stringify(out_obj), 'cache.json');
  })

  // Selection list of all node labels allows user to zoom in on one
  $("#label_search").on('change', function(item){
    if (this.value != '')
      setNodeReport(top.dataLookup[this.value])
    top.dataLookup[this.value].highlight = true;
      top.GRAPH.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' });
  })

  $("#upload_cache").on('change', function(event) {
    var reader = new FileReader();

    reader.onload = function(event) {
      top.NODES_JSON = JSON.parse(event.target.result);
    }

    reader.readAsText(event.target.files[0]);
  })

  // Uploads JSON cache file
  $("#upload_json_button").on('click', function(item){
    const cache_url = $("#upload_cache").val();
    const onto_url = $("#ontology_url").val();
    const url_ok = RE_URL.exec(onto_url);

    if (!url_ok) {
      alert(`The ontology URL: "${onto_url}" is not valid`);
    }

    if (cache_url > '' && url_ok) {
      try {
        load_uploaded_graph();
      }
      catch (err) {
        alert("Something is wrong with either the URL or the cache file. Ensure that the URL is pointing directly to an owl rdf/xml file and that the cache file corresponds to the correct ontology. " + err.message);
        data = null;
      }
    }
  })

  //$("#ontology_url").on('change', function(item) {
  //  alert("Fetching: " + this.value)
  //  get_ontology(this.value)
  //})

  $("#ontology_url_button").on('click', function(item) {
    const url = $("#ontology_url").val()
    const url_ok = RE_URL.exec(url)
    if (url_ok)
      try {
        load_data(url, do_graph);
      }
      catch (err) {
          alert("URL fetch didn't work. Note, URL must point directly to an owl rdf/xml file.  It can't be redirected to another location: " + err.message)
          data = null;
      }
    else
      alert(`The ontology URL: "${url}" is not valid`)
  })

  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_deprecated").on('change', function(item) {
    RENDER_DEPRECATED = this.checked;
    do_graph(); // Recalculate dataset with deprecated terms
  })

  //light mode
  $("#high_contrast").on('change', function(item) {
    HIGH_CONTRAST = this.checked
    load_data(ONTOLOGY, load_graph);

  })

  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_relationships").on('change', function(item) {
      RENDER_RELATIONSHIPS = this.checked
    if(ONTOLOGY)
    {
      load_data(ONTOLOGY, load_graph);
    }

    })


  // upper level ontology edge coloring
  $("input[name='ulo_edge_coloring']").on('click', function(item) {
    RENDER_ULO_EDGE = (this.value == 'true');
    $('#ulo_legend').toggle(RENDER_ULO_EDGE);
    $('#ontology_legend').toggle(!RENDER_ULO_EDGE);

    if (top.GRAPH) {
      top.GRAPH.refresh();
    }
  })


  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_slices").on('change', function(item) {
    RENDER_SLICES = this.checked;
    do_graph(); // Recalculate dataset with deprecated terms
  })

  $("#thickness_control").on('change', function(item) {
    GRAPH_LINK_WIDTH = parseFloat(this.value)
    if (top.GRAPH) {
      top.GRAPH.refresh();
    }
  })

  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_quicker").on('change', function(item) {
    RENDER_QUICKER = this.checked
    if (top.GRAPH) {
      top.GRAPH.refresh();
    }
  })

  $("#render_labels").on('change', function(item) {
    RENDER_LABELS = this.checked
    top.GRAPH.refresh();
  })

  $("#render_dimensions").on('change', function(item) {
    GRAPH_DIMENSIONS = parseInt(this.value)
    if (top.GRAPH) {
      // It appears iterative algorithm doesn't work with num dimensions
      // because it fixes x,y,z of parent nodes.  Must switch to alternate
      // rendering algorithm, or relax x,y,z for nodes below a certain depth.
      top.GRAPH.numDimensions(GRAPH_DIMENSIONS);
      do_graph();

    }
  })

  $("#render_layer_depth").on('change', function(item) {
    GRAPH_NODE_DEPTH = parseInt(this.value)
    if(!RENDER_RELATIONSHIPS){
      top.GRAPH.dagLevelDistance(GRAPH_NODE_DEPTH)
    }

  })

  // Controls depth of nodes being rendered.
  $("#depth_control").on('change', function(item) {
    RENDER_DEPTH = parseInt(this.value)
    do_graph();
  })

  $("#text_size").on('change', function(item) {
    FONT_SIZE = parseInt(this.value)
    top.GRAPH.refresh();
  })


  $("#repulsion").on('change', function(item) {
    REPULSION_STRENGTH = parseInt(this.value)
    top.GRAPH.d3Force('charge').strength(-(REPULSION_STRENGTH));

        load_data(ONTOLOGY, load_graph);

  })

  $("#highlight_option").on('change', function() {
    clearHighlight()
    // Reset all highlight options to false
    ROOT_HIGHLIGHT = false;
    IMMEDIATE_CHILDREN_HIGHLIGHT = false;
    ALL_CHILDREN_HIGHLIGHT = false;
    ALL_DIRECT_RELATIONS = false;

    // Set the selected highlight option to true
    switch (this.value) {
      case 'Root':
        ROOT_HIGHLIGHT = true;
        break;
      case 'ImmediateChildren':
        IMMEDIATE_CHILDREN_HIGHLIGHT = true;
        break;
      case 'AllChildren':
        ALL_CHILDREN_HIGHLIGHT = true;
        break;
      case 'AllDirectRelationships':
        ALL_DIRECT_RELATIONS = true;
        break;
    }
  });


  // Selection list of all node labels allows user to zoom in on one
  $("#select_child").on('change', function(item){
    if (this.value != '')
      setNodeReport(top.dataLookup[this.value])
    top.dataLookup[this.value].highlight = true;
    top.GRAPH.refresh()
    window.scrollTo({ top: 0, behavior: 'smooth' });
  })

  // Trace works on ROBOT "explain" Markdown format report.
  $("#trace_button").on('click', function(item){
    var trace_content = $('#trace_content').val().trim()
    if (trace_content != '') {

      // DisjointWith node to focus on in analysis, if any.
      var focus = null

      var content = trace_content.split('\n')
      // Set up these arrays to catch any new nodes or links not existing in current graph
      var new_nodes = []
      var new_links = []

      for (ptr in content) {

        var result = triple_parse(content[ptr])

        if (result) {

          var subject_node = get_node_from_url(new_nodes, result.subject_uri, result.subject_label)
          var object_node = get_node_from_url(new_nodes, result.object_uri, result.object_label)

          if (subject_node && object_node)
            switch (result.relation) {

              case 'DisjointWith':
                // Find shared parent class/node of both those nodes
                // - that is where disjointness is defined?
                //alert(source_id + " disjoint with " + target_id)

                link = get_link(new_links, subject_node, object_node, 20, result.relation, 0xFF0000); // RED
                // Set Focus here
                link.highlight = 0xFF0000;
                focus = subject_node;
                break;

              case 'SubClassOf':
                link = get_link(new_links, object_node, subject_node, 10, result.relation, 0xFFA500); // Orange
                link.highlight = 0xFFA500;
                break;
            }
        }
      }

      // There are new node or links to add
      if (new_nodes.length || new_links.length) {
        const { nodes, links } = top.GRAPH.graphData();
        nodes.push(...new_nodes);
        links.push(...new_links);
        top.GRAPH.graphData({'nodes': nodes,'links': links});

      }

      top.GRAPH.refresh();// Trigger update of 3d objects in scene

      if (focus)
        setNodeReport()
    }
  })
}


/************************** CONTRADICTION REPORTING ***************************/

function triple_parse (line) {
  /* This is for the superimposition of unsatisfiability explanations provided
  by OWLAPI. Ontotrek provides a short instruction about how to get these via
  the command line https://robot.obolibrary.org/ tool. These explanations come
  in the form of a list of [subject] [relation] [object] triples which have
  at least one triple that is causing unsatisfiability.

  Here we use a regular expression to find markdown expressions of
  [subject relation object] tripe and return a dictionary of each element.

  INPUT: a text line hopefully of Markdown format representation of a triple
  generated by the "robot" program (https://robot.obolibrary.org/). Example
  line:

    "- [geopolitical region](http://semanticscience.org/resource/SIO_000415) SubClassOf [designated area on Earth](http://purl.obolibrary.org/obo/GENEPIO_0001886)"

  OUTPUT: A dictionary key values in pattern of:

    { object_label: "immaterial entity"
      object_uri: "http://purl.obolibrary.org/obo/BFO_0000141"
      relation: "DisjointWith"
      subject_label: "material entity"
      subject_uri: "http://purl.obolibrary.org/obo/BFO_0000040"
    }

  */

  var matchObj = RE_MD_TRIPLE.exec(line);
  if (matchObj)
    return matchObj.groups

  //console.log("line", line, "regex", matchObj)
  return null
}

function get_node_from_url(new_nodes, url, label) {
  /*  RE_NAMESPACE_URL on ontology term URL returns dictionary {
    prefix: "http://purl.obolibrary.org/obo/BFO_",
    namespace: "BFO",
    id: 123456}
  */
  const re_node = RE_NAMESPACE_URL.exec(url)
  if (re_node) {
    groups = re_node.groups
    node_id = groups.namespace + ':' + groups.id
    var node = top.dataLookup[node_id]
    if (!node) {
      node = make_node(new_nodes, node_id, label)
    }
    node.highlight = true;
    return node
  }
  
  console.log("Problem parsing:", url)
  return node
}

function make_node(new_nodes, node_id, label) {
  // Used in Markdown to triple conversion
  // FUTURE: Code z-axis based on depth call.
  node = {
    'id':             node_id,
    'rdfs:label':     label,
    'rdfs:subClassOf': [],
    'restrictionTriples' : [],
    'parent_id':      null,
    'group_id':       null,
    'IAO:0000115':    '',
    'color':          '#FFF', // Default color by ontology
    'depth':          4, // Initializes a bigger but not giant label
    'children':       []
  };
  new_nodes.push(node);
  // console.log("common : " + node.restrictionTriples)
  top.dataLookup[node.id] = node;

  return node
}

function get_link(new_links, source, target, radius, label, highlight_color) {
  /* Highlights link between source_id node and target_id node.
  Makes a link if one doesn't exist and adds to new_links.
  */

  var link = top.linkLookup[`${source.id}-${target.id}`]
  if (!link) {
    link = set_link(new_links, source, target, radius, label, highlight_color);
  }
  return link
  /* This is direct access code to link that has already been entered into
  graph. Issue with direct access is THREE is reusing material definitions as
  objects on creation. Can't set color of individual materials.  Seems to
  be a different story for nodes which are individually created materials.
  if (link.__lineObj) {
    link.__lineObj.material.color.setHex(hex_color)
    link.__lineObj.scale.x = 2
    link.__lineObj.scale.y = 2
    link.__lineObj.scale.z = 2
  }
  */

}


function load_data(URL, callback) {
  /*
    Fetch json data file that represents simplified .owl ontology
    OR owl file in rdf/xml format 
  */
  // Debugging: Output the URL to check if it's correct
  console.log('Fetching data from:', URL);

  var xhttp = new XMLHttpRequest();
  //Access-Control-Allow-Origin
  //* header value 
  // FOR WEBSERVER???
  var json_file_type = URL.toLowerCase().indexOf('json') > 0;
  if (json_file_type)
    xhttp.overrideMimeType("application/json");
  else
    xhttp.overrideMimeType("rdf/xml");
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        try {
          if (json_file_type) {
            // CONVERSION JSON data to work with new OWL format
            var data = JSON.parse(this.responseText)
            Object.keys(data.specifications).forEach(function(id) {
              var node = data.specifications[id]
              node['rdfs:subClassOf'] = [node.parent_id]
              if (node.label) node['rdfs:label'] = node.label
              if (node.definition) node['IAO:0000115'] = node.definition
              if (node.deprecated) node['owl:deprecated'] = node.deprecated
              if (node.other_parents) node['rdfs:subClassOf'].push(...node.other_parents)
            })
            data.term = data.specifications;
            delete(data.specifications)
          }
          else {
            var store = $rdf.graph();
            // Give it a full URL so OWL has proper file address
            if (URL.indexOf('http') != 0)
              URL = RE_URL.exec(document.location) + URL;
            try {
              // Given url is used simply to identify ontology source.
              // Good tips here: https://github.com/solid/solid-tutorial-rdflib.js/issues/4
              $rdf.parse(this.responseText, store, URL, 'application/rdf+xml');
              data = process_ontology(store);


              var store = $rdf.graph();
            }

            catch (err) {
                console.log(err)
                alert("OWL couldn't parse" + err.message)
                data = null;
            }
          }
        }
        catch(err) {
          alert("Error:" + err.message);
          data = null;
        }

        top.RAW_DATA = data;
        callback()
      }
      else {
        alert("There was a problem loading this URL! (If it redirects somewhere, that isn't allowed): " + URL)
      }
    }
  }
  xhttp.open("GET", URL, true);
  xhttp.send(null);
};


function init_search(data) {
  /*
    Create a select list of all the node labels, in alphabetical order.
    Includes search of the node's synonyms via a customization of chosen.js
  */

  var label_search = $("#label_search")
  label_search.empty().append('<option value="">Term search ...</option>')

  if (data) {      
    // search 
    var sorted_data = data.nodes.concat().sort(function(a,b) {
      return (a['rdfs:label'] == undefined || a['rdfs:label'].localeCompare(b.label))
    })

    for (var item in sorted_data) {
      var node = sorted_data[item]
      //var option = $(`<option value="${node.id}">${node['rdfs:label']}</option>`);
      //HERE
      var option = $(`<option value="${node.id}">${node.label}</option>`);

      // Search by any of the terms related synonyms
      var synonyms = []
      SYNONYM_FIELD.forEach(function(synonym) {
        if (node[synonym])
          synonyms.push(node[synonym])
      });
      var synonym_str = synonyms.length ? ';' + synonyms.join(';') : '';

      // Allows searching by node id as well.
      option.attr('synonyms', node.id + synonym_str); 

      label_search.append(option);
    }
  }
  
  label_search.chosen({
    placeholder_text_single: 'Term search ...',
    no_results_text: "Oops, nothing found!",
    disable_search_threshold: 10,
    search_contains: true, //substring search
  })

  label_search.prop('disabled', data && data.nodes.length > 0 ? false : true)
  label_search.trigger("chosen:updated");
  
}

function adjustSaturation(color, saturationFactor) {
  const hexRegex = /^#([A-Fa-f0-9]{6})$/;
  const match = color.match(hexRegex);

  if (!match) {
    return color; // Return the original color if it doesn't match the expected format
  }

  const hexValue = match[1];

  // Convert hexadecimal to RGB values
  const r = parseInt(hexValue.substr(0, 2), 16);
  const g = parseInt(hexValue.substr(2, 2), 16);
  const b = parseInt(hexValue.substr(4, 2), 16);

  // Calculate avergae value
  const averageValue = (r + g + b) / 3;

  // adjust saturation by saturation factor
  const adjustedR = r * saturationFactor + (1 - saturationFactor) * averageValue;
  const adjustedG = g * saturationFactor + (1 - saturationFactor) * averageValue;
  const adjustedB = b * saturationFactor + (1 - saturationFactor) * averageValue;

  // Convert RGB values back to hexadecimal
  const adjustedHexValue = (Math.round(adjustedR) << 16) + (Math.round(adjustedG) << 8) + Math.round(adjustedB);
  // console.log(color, " ", adjustedHexValue.toString(16).padStart(6, '0'));
  return `#${adjustedHexValue.toString(16).padStart(6, '0')}`;
}



function init_ontofetch_data(rawData, cache=null) {
  /*
  This is a 2 pass algorithm.
  
  1st pass: Establish node depth and label, and color based on node prefix.
  2nd pass: Establish links and adjust according to parent node depth.

  INPUT
    rawData.term: Array of nodes

  */

  top.dataLookup = {};
  top.linkLookup = {};

  let data = {'nodes':[], 'links':[]};

  if (!rawData)
    return data;

  // 1st pass does all the nodes.
  for (var item in rawData.term) {
    let node = rawData.term[item];
    
    if (!node['owl:deprecated'] || RENDER_DEPRECATED) {
      try {
        if (cache != null) {
          let cached_node = cache.filter(obj => {
            return obj.id == item
          })[0];
          
          node.x = cached_node.x;
          node.y = cached_node.y;
          node.z = cached_node.z;
        }
      } catch {
        console.log("Warning: A node is undefined");
      }

      node.children = [];
      node.color =    null;
      node.depth =    0;
      node.group_id = null;
      node.prefix = get_term_prefix(node.id);
      set_node_label(node);
      data.nodes.push(node);
      top.dataLookup[node.id] = node;
      
      let ancestors = [node];
      let focus = node;
      while (focus.parent_id) {
        if (focus.id == focus.parent_id) {
          console.log('ERROR: ontology term has itself as parent:' + focus.id)
          focus.depth = 1;
          break;
        }
        if (!rawData.term[focus.parent_id]) {
          focus.depth = 1;
          break;
        }
        
        focus = rawData.term[focus.parent_id];
        
        if (focus.depth) { // already calculated depth.
          break;
        }
        if (!focus.parent_id) {
          focus.depth = 1;
          break;
        }
        ancestors.push(focus);
      }
      // focus now has depth to convey to all ancestors
      // Ancestors are in reverse order, from shallowest to deepest.
      // Bizarrely, ptr is a string if using "(ptr in ancestors)" !
      for (var ptr = 0; ptr < ancestors.length; ptr ++) {
        // Don't use ancestor = ancestors.pop(); seems to intefere with data.nodes ???
        let ancestor = ancestors[ancestors.length - ptr - 1];
        ancestor.depth = focus.depth + ptr + 1;
      }
    }
    
  }

  // To support the idea that graph can work on top-level nodes first
  data.nodes.sort(function(a,b) { return (a.depth - b.depth) })
  
  // If custom render depth chosen, chop nodes deeper than that. 
  if (RENDER_DEPTH != 50) {
    data.nodes = data.nodes.filter(n => (n.depth <= RENDER_DEPTH)) ;
  }
  
  // Establish lookup table for all nodes
  data.nodes.forEach((n, idx) => {top.dataLookup[n.id] = n }); 
  
  // 2nd pass does LINKS organized by depth, i.e. allowing inheritance of properties:
  for (let item in data.nodes) {
    let node = data.nodes[item];
    // Size node according to proximity to depth 0.
    node.radius = Math.pow(2, 6-(node.depth/4)); // # of levels
    
    // Any node which has a layout record including custom color, gets group_id = itself.
    if (top.layout[node.id] && top.layout[node.id].color) {
      node.group_id = node.id;

      // Color by layout overrides all
      let layout_group = top.layout[node.id];
      if (layout_group.color) {
        node.color = top.colors[layout_group.color];


      }
    };

    // Otherwise node.group is inherited from parent 
    if (node.parent_id) {
      const parent = top.dataLookup[node.parent_id];
      if (parent) {
        if (!node.group_id  && parent.group_id) {
          node.group_id = parent.group_id;
        }
        set_link(data.links, parent, node, node.radius);
      }
    }

    // Color by ontology
    if (node.color === null) {
      node.color = getOntologyColor(node);

    }

    if(node.color){
      var maxDepth = data.nodes[data.nodes.length-1].depth;
      console.log(maxDepth)
      const saturationFactor = 1- (node.depth * 7/(6.7*maxDepth));
      // console.log(saturationFactor);
      node.color = adjustSaturation(node.color, saturationFactor);

    }


  }

  if (RENDER_DEPTH != 50) {
    // Chop link content off by depth that user specified.
    // top.dataLookup only has nodes included in graph to given depth at this point.
    data.links = data.links.filter(l => top.dataLookup[l.source] && top.dataLookup[l.target]); 
  }

  data.nodes = preposition_nodes(data.nodes);

  set_legend(data);

  return data
}

function getOntologyColor(node) {
  var prefix = get_term_prefix(node.id);
  //console.log(node)
  if (prefix in prefix_color_mapping){
    return colors[prefix_color_mapping[prefix].color];
  }

  console.log ('Missing color for ontology prefix ' + prefix + ' in ' + node.id);
  return 'red'
}

/*
  Redraw legends according to given data.nodes
  One legend prepared for count by ontology term prefix
  Other legend prepared for count by ULO group a term falls under 
*/
function set_legend(data) {

  var ontology = {};
  var ulo_branch = {};

  for (var ptr in data.nodes) {
    const node = data.nodes[ptr];
    const prefix = get_term_prefix(node.id);
    
    if (!node['owl:deprecated']) { 

      // Stores a count of each prefix
      if (prefix in ontology) 
        ontology[prefix].count += 1;
      else {
        ontology[prefix] = {
          count: 1, 
          label: prefix, 
          color: prefix_color_mapping[prefix] ? prefix_color_mapping[prefix].color : null
        };
      }
      // Figure out what to sort on

      // Store a count of ULO branch underlying nodes
      if (node.group_id in ulo_branch) 
        ulo_branch[node.group_id].count += 1;
      else {
        const group = top.dataLookup[node.group_id];
        if (group) {
          const layout_group = top.layout[group.group_id];
          ulo_branch[group.group_id] = {
            count: 1,
            label: group['rdfs:label'],
            prefix: get_term_prefix(group.id),
            color: top.colors[layout_group.color],
            ulo: true
          }
        }
      }
    }
  }
  set_legend_section('#ulo_legend', ulo_branch);
  set_legend_section('#ontology_legend', ontology);
}

// Render legend for coloring by ontology or ULO
function set_legend_section(dom_id, legend_dict) {

  $(dom_id).empty();

  for (var key of Object.keys(legend_dict).sort()) {
    item = legend_dict[key];
    // Don't show ULO category if only 1 item, or if there is a custom layout color for it
    if (!item.ulo || (item.count >1 || item.prefix && top.layout[key].color)) {
      $(dom_id).append(
        `<div class="legend_color" style="background-color:${item.color}">${item.count}</div>
        <div class="legend_item">${item.label}</div>
        <br/>`
      );
    }
  }

  if ($(dom_id).children('div').length)
      $(dom_id).prepend('<div class="legend_header">' + (dom_id == '#ulo_legend' ? 'ULO Branch Legend': 'Ontology Legend') + '<div/>');

}


function set_node_label(node) {
  /* Makes a clipped short_label for long labels.
  Also ensures id is shown if term has no rdfs:label
  */
  var label = node['rdfs:label'] // was node.label
  if (label) {
    // label derived from node's first few words ...
    node.label = node['rdfs:label'];
    node.short_label = label.replace(LABEL_RE, '$1*');
    if (node.short_label.indexOf('*') > 0)
      node.short_label = node.short_label.split('*',1)[0] + ' ...'
  }
  else {
    //console.log(node.id.match(LABEL_RE2))
    //extract shorter label from node.id if node.label is not explicitly defined
    node.label = node.id.match(LABEL_RE2);
    node.short_label = node.id.match(LABEL_RE2);
  }
}

/* Creates a new link in given links array
@param source node
@param target node
@param radius integer
@param label string [of node, not used]
@parap color: string Highlight color of link
*/
function set_link(links, source, target, radius, label='', color=null, other=false) {

  // Issue: after this is rendered, seems to switch source,target to objects?
  var link = { 
    source: source.id, 
    target: target.id, 
    label: label,
    highlight_color: color, // Hex or string
    indicator_colour : '#FF7000',
    width: 5,
    other: other
  };

  links.push(link);
  top.dataLookup[source.id].children.push(target.id);
  top.linkLookup[source.id + '-' + target.id] = link;
  return link;
}

function get_node_radius(node, fancyLayout) {
  /*
  Vary node radius by depth from root of structure.
  */
  if (node.highlight)
    return node.radius
  if (node.radius > GRAPH_NODE_RADIUS)
    return node.radius
  return GRAPH_NODE_RADIUS
}

function preposition_nodes(nodes) {
  /*
  Force graph begins dynamics normally by randomly placing nodes, but
  this leads to challenging situations where nodes are not even remotely
  where they should be - and their edge attraction can't get them back
  to local context.
  */
  for (var item in nodes) {
    var node = nodes[item];

    if (!RENDER_GALAXY)
        // Initially fix all nodes
      node.fz = node_depth(node);

    // Give initial x,y hint based on parents
    var layout_node = top.layout[node.id];
    if (layout_node) {
      node.fz = node_depth(node);
      node.fx = layout_node.x;
      node.x = layout_node.x;
      node.fy = layout_node.y;
      node.y = layout_node.y;
    } else {
      // Spread out the nodes by adding random offsets to their positions
      // node.fx = node.x + Math.random() * 4000 - 50;
      // node.fy = node.y + Math.random() * 4000 - 50;
    }
  }
  return nodes;
}


function node_depth(node) {
  /*
  Returns depth tier calculated as 1000 - depth of node from top of hierarchy in 
  GRAPH_NODE_DEPTH increments, but with first 6 levels having a power relation
  So 0:1024, 1:512, 2:256, 3:128, 4:64, 5: -100, 6: -200, 7: -300 etc.
  */
  base = node.depth < 11 ? 2 ** (10-node.depth) : 0  
  return base - (node.depth- 4) * GRAPH_NODE_DEPTH;
}


function render_node(node, hover) {
  var group = new THREE.Group();
  var numChildren = node.children.length;
  var fancyLayout = layout[node.id] || !RENDER_QUICKER;
  var nodeRadius = get_node_radius(node, fancyLayout);
  var colour = node.color;
  var opacity = 1;
  if(hover && !node.highlight)
  {
   opacity = 0.3;
   if(HIGH_CONTRAST)
   {
     colour = '#cbcbcb'
   }else{
     colour = '#444444'
   }

  }
  if (fancyLayout || node.depth < 15) {
    // Create the main sphere
    var geometry = new THREE.SphereGeometry(nodeRadius, 3, 0);
    var material = new THREE.MeshStandardMaterial({ color: node.highlight ? '#FF7000' : colour, fog: false, opacity: node.highlight ? 1 : opacity, transparent: true });
    var sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0);

    var scaleFactor = ((numChildren / 2) + 1);

    if (scaleFactor > 5) {
      scaleFactor = scaleFactor * 3;
    }
    var indicatorMaterial = new THREE.MeshStandardMaterial({ color: node.highlight ? '#FF7000' : colour, fog: false, opacity: 0.2, transparent: true, depthWrite : false });
    var indicatorGeometry = new THREE.CylinderGeometry(nodeRadius);
    var indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);

    indicator.position.set(0, 0, 0);
    indicator.scale.x = scaleFactor;
    indicator.scale.z = scaleFactor;
    indicator.scale.y = scaleFactor;

    if(node.highlight)
    {

      var highlightMaterial = new THREE.MeshStandardMaterial({ color: '#FF7000' , fog: false, opacity: 0.2, transparent: true, depthWrite : false });
      var highlightGeometry = new THREE.SphereGeometry(nodeRadius,6,6);
      var highlighter = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlighter.position.set(0, 0, 0);

      highlighter.scale.x = 2;
      highlighter.scale.z = 2;
      highlighter.scale.y = 2;

      group.add(highlighter)

    }

    if(CLUSTERS){
      group.add(indicator);

    }
    group.add(sphere);

    // // Create cones (spikes) for each child
    //
    // var spikeRadius = nodeRadius * 0.3; // Adjust the base radius of spikes as needed
    // var spikeHeight = nodeRadius * 2; // Adjust the height of spikes as needed
    // var coneMaterial = new THREE.MeshPhongMaterial({ color: node.highlight ? '#FF7000' : colour }); // Yellow color
    // var coneGeometry = new THREE.ConeGeometry(nodeRadius * 0.3, nodeRadius * 1.3, 9);
    // // Add spikes for each child
    // for (var i = 0; i < numChildren; i++) {
    //   // Calculate the position of the spike on the sphere's surface
    //   var angle = (i / numChildren) * Math.PI * 2; // Uniformly spaced around the sphere
    //   var spikeX = nodeRadius * Math.sin(angle); // Pointing upwards
    //
    //   var spikeY = nodeRadius * Math.cos(angle); // Keep spikeY unchanged
    //   var spikeZ = nodeRadius * Math.sin(angle) * Math.sin(Math.PI / 2); // Pointing upwards
    //
    //   // Create the spike mesh and add it to the group
    //   var spike = new THREE.Mesh(coneGeometry, coneMaterial);
    //   spike.position.set(spikeX, spikeY, spikeZ);
    //
    //   // Calculate the direction vector from the spike's position to the sphere center
    //   var direction = new THREE.Vector3().subVectors(spike.position, sphere.position).normalize();
    //
    //   // Define the scaling factor to push the spike outward
    //   var scalingFactor = nodeRadius * 0.3; // Adjust this value to control the outward movement
    //
    //   // Apply scaling to the spike's position to move it outward
    //   spike.position.addScaledVector(direction, scalingFactor);
    //
    //   // Compute the rotation quaternion to align the spike with the direction vector
    //   var rotationQuaternion = new THREE.Quaternion();
    //   rotationQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    //   spike.quaternion.copy(rotationQuaternion);
    //
    //   //group.add(spike);
   // }
    node.marker = group;
  }

  if (RENDER_LABELS) {
    var depthFactor = node.depth > 4 ? 2 : 10 - node.depth * 2;

    var sprite = new SpriteText(node.short_label);

    var labelColour = node.color
    if(hover && !node.highlight)
    {
      if(HIGH_CONTRAST)
      {
        labelColour = '#cbcbcb'
      }else{
        labelColour = '#444444'
      }
    }
    sprite.color = node.highlight ? HIGH_CONTRAST? '#101020':'#FFFFFF' : labelColour;
    sprite.textHeight =  node.highlight ? 8 * (FONT_SIZE) : nodeRadius * (FONT_SIZE)/4;
    // Calculate the offset position for the label
    var zOffset = nodeRadius * 2 + depthFactor;
    sprite.position.set(0, zOffset+20, 0);

    group.add(sprite); // Add the label sprite to the group
  }

  return group;
}

function get_term_prefix(entity_id) {
  return entity_id ? entity_id.split(':')[0].split('#')[0] : null;
}

function lookup_url(term_id, label) {
  /* Returns HTML link of full "native" term URI, as well as OLS link.
  */

  if (!label)
    label = top.dataLookup[term_id].label

  var ols_lookup_URL = null
  // If no prefix, then whole term_id returned, and its probably a URI
  var prefix = get_term_prefix(term_id) 
  if (prefix == term_id) { 
    var term_url = term_id
  }
  else {
  // A prefix was recognized
    ols_lookup_URL = `https://www.ebi.ac.uk/ols/ontologies/${prefix}/terms?iri=`
    term_url = top.RAW_DATA['@context'][prefix]
    if (!term_url) {
      term_url = ONTOLOGY_LOOKUP_URL
    }
    term_url = term_url + term_id.split(/[:#]/)[1]

  }

  return  `<a href="${term_url}" target="_term">${label}</a>` + (ols_lookup_URL ? `, <a href="${ols_lookup_URL}${term_url}" target="_term">OLS</a> ` : '')
}


function get_term_id_urls(parent_list) {
  /* Gets HTML link list of all parents so one can click on them to navigate.
    
  */
  var parent_uris = []
  if (parent_list) {
    for (ptr in parent_list) {
      const parent_id = parent_list[ptr]
      var parent = top.dataLookup[parent_id]
      if (parent) {
        if (parent['rdfs:label'])
          parent_label = parent['rdfs:label']
        else
          parent_label = parent_id
        parent_uris.push(`<span class="focus" onclick="setNodeReport(top.dataLookup['${parent_id}'])">${parent_label}</span>`)
      }
      // alternate parents may not be in current node graph
      /* else {
        parent_uris.push('unrecognized: ' + parent_id)
      } */
    }
  }
  return parent_uris.length ? parent_uris.join(', ') : null
}

/*
  Render details about node in sidebar, and position camera to look at
  node from same vertical level.
  An empty node parameter causes sidebar information to be cleared out.
*/ 
function setNodeReport(node = {}) {
  parents = get_term_id_urls(node['rdfs:subClassOf'])

  // Label includes term id and links to 
  if (node['rdfs:label']) {
    //HERE node.label
    label = node.label + (node['owl:deprecated'] ? ' <span class="deprecated">deprecated</span>' : '') + '<span class="label_id"> (' + node.id + ' ' +lookup_url(node.id, 'OntoBee' ) + ') </span>'
  }
  else {
    label = null;
  }
  // <img src="img/link_out_20.png" border="0" width="16">
  $("#parents").html(parents || '<span class="placeholder">parent(s)</span>');
  $("#label").html(label || '<span class="placeholder">label</span>');
  // was node.definition
  $("#definition").html(node['IAO:0000115'] || '<span class="placeholder">definition</span>');

  $("#synonyms").html(node.synonyms || '<span class="placeholder">synonyms</span>');
  
  if (node.ui_label)
    $("#ui_label").show().html(node.ui_label);
  else
    $("#ui_label").hide();

  if (node.ui_definition)
    $("#ui_definition").show().html(node.ui_definition);
  else
    $("#ui_definition").hide();

  var select_child = $("#select_child")
  select_child.empty()
  select_child.css('visibility', node.children && node.children.length > 0 ? 'visible':'hidden')
  if (node.children && node.children.length > 0) {
    var option = document.createElement("option");
    select_child.append('<option value="">children ...</option>')

    for (var item in node.children) {
      const child = top.dataLookup[node.children[item]]
      if (child)
        select_child.append(`<option value="${child.id}">${child.label}</option>`)
    }
  }

  if (node.x) {

    top.GRAPH.cameraPosition(
      {x: node.x, y: node.y, z: node.z + 2000}, // new position  + CAMERA_DISTANCE/2
      node // lookAt ({ x, y, z })
        // 4 second transition duration
    )

  }
}

