var poly;
var map;
var heatmap;
var path_select;
var max_paths = 10;
var markers = [];
var saved_paths = [];
var socket = io();

// handle socket events
socket.on('get saved paths', function(){
  console.log('Get saved paths:');
  // send saved paths to the server
  socket.emit('reply from client', getPoints());
});

/**
 *  @brief initMap
 *  
 *  @return none
 *  
 *  @details Initialise the map application
 */
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 14,
    maxZoom: 14,
    minZoom: 14,
    draggable: false,
    disableDefaultUI: true,
    center: {lat: 60.1675, lng: 24.9311}, 
  });
  
	path_select = document.getElementById("path_select");
  
  // Set the first option selected by default
  path_select.options[0] = new Option("Path 1 (empty)", 0, false, true);
  saved_paths[0] = null;
  
  // Set the rest options as not selected
  for (var i = 1; i < max_paths; i++) {
  	path_select.options[i] = new Option("Path " + (i+1) + " (empty)", i);
    saved_paths[i] = null;
  }
  
  // init the polyline
  poly = new google.maps.Polyline({
  });
  poly.setMap(map);

  // register "on click" listener for the map
  map.addListener('click', addPointToPath);
  
  // init the heatmap (as not visible)
  heatmap = new google.maps.visualization.HeatmapLayer({
      	    data: getPoints(),
    	      map: null
  });

}

/**
 *  @brief selectPath
 *  
 *  @return none
 *  
 *  @details Activates selected path on map
 */
function selectPath() {
	var selected_path = getSelectedPath();
  // remove heatmap if visible
  removeHeatMap();
  // remove markers
  clearMarkers();
  // remove any visible path
  poly.setMap(null);
  if (saved_paths[selected_path]){
  	poly = saved_paths[selected_path];
  } else {
  	poly = new google.maps.Polyline({
  	});
  }
  // draw selected path
  poly.setMap(map);
}

/**
 *  @brief getSelectedPath
 *  
 *  @return none
 *  
 *  @details Checks which path is selected in "selection" widget
 */
function getSelectedPath() {
	var ret = 0;
	for (var i = 0; i < path_select.options.length; i++) {
    if (path_select.options[i].selected == true) {
    	ret = i;
  	}
	}
  return ret;
}

/**
 *  @brief savePath
 *  
 *  @return none
 *  
 *  @details Saves selected path to saved paths
 */
function savePath() {
  var selected_path = getSelectedPath();
  // push to paths table
  saved_paths[selected_path] = poly;
  // Remove the "(empty)" text from selection
  path_select.options[selected_path] = new Option("Path " + (selected_path+1), selected_path, false, true);
  // tell server that data has changed
  socket.emit('refresh now');
}

/**
 *  @brief clearPath
 *  
 *  @return none
 *  
 *  @details Removes selected path from saved paths and clears it from map
 */
function clearPath() {
  var selected_path = getSelectedPath();
  // remove from paths table
  saved_paths[selected_path] = null;
  // clear the path from map
  poly.setMap(null);
  // hide markers
  clearMarkers();
  // Add the "(empty)" text to selection
  path_select.options[selected_path] = new Option("Path " + (selected_path+1) + " (empty)", selected_path, false, true);
  // prepare selected path for clicks
  selectPath();
  // tell server that data has changed
  socket.emit('refresh now');
}

/**
 *  @brief showHeatMap
 *  
 *  @return none
 *  
 *  @details Shows heat map if not visible, hides heat map if visible
 */
function showHeatMap() {
	if (heatmap.getMap()) {
    // hide the heatmap
  	heatmap.setMap(null);
    // show selected path
    selectPath();
  } else {
		heatmap = new google.maps.visualization.HeatmapLayer({
      	    data: getPoints(),
    	      map: map
  	});
    // show the heatmap
  	heatmap.setMap(map);
    // hide selected path
    poly.setMap(null);
    // hide markers
    clearMarkers();
  }
}

/**
 *  @brief removeHeatMap
 *  
 *  @return none
 *  
 *  @details Hides heat map if visible
 */
function removeHeatMap() {
	if (heatmap.getMap()) {
  	heatmap.setMap(null);
  }
}

/**
 *  @brief getPoints
 *  
 *  @return MVC_array
 *  
 *  @details Returns all saved path points as MVC array
 */
function getPoints() {
	// MVCArray used for better performance with lots of coordinates
  var ret = new google.maps.MVCArray();
  
  for (var i = 0; i < max_paths; i++) {
    if (saved_paths[i]) {
			var path = saved_paths[i].getPath();
      var pathLen = path.getLength();
      for (var j = 0; j < pathLen; j++) {
        ret.push(path.getAt(j));
      }
		}
  }
  // return single MVCArray of coordinates
	return ret;
}

/**
 *  @brief addPointToPath
 *  
 *  @return none
 *  
 *  @details Handles all mouse clicks on the map
 */
function addPointToPath(click) {
	// click on the map does nothing if heatmap is visible
  if ( ! heatmap.getMap()) {
    // Get path as an array of LatLng objects (MVCArray)
    var path = poly.getPath();
    // Push the click coordinates to top of the path
    path.push(click.latLng);

    // Add a new marker at the new point on the path
    addMarker(click.latLng);
  }
}

/**
 *  @brief addMarker
 *  
 *  @return none
 *  
 *  @details Adds a marker to the map and to the markers table
 */
function addMarker(latLng) {
  var marker = new google.maps.Marker({
    position: latLng,
    map: map
  });
  markers.push(marker);
}

/**
 *  @brief showMarkers
 *  
 *  @return none
 *  
 *  @details Shows the markers of the table on the map
 */
function showMarkers(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

/**
 *  @brief clearMarkers
 *  
 *  @return none
 *  
 *  @details Removes the markers from the map and from the markesr table
 */
function clearMarkers() {
  showMarkers(null);
  markers = [];
}

/**
 *  @brief exportAsJSON
 *  
 *  @return none
 *  
 *  @details export all saved paths as JSON file (save as json)
 *           utilises FileSaver.js module
 */
function exportAsJSON() {
  var data = JSON.stringify(getPoints(), null, 2);
  //console.log(data);
  var blob = new Blob([data], {type: "text/plain;charset=utf-8"});
  saveAs(blob, "Paths.JSON");
}


