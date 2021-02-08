const modelParams = {
  flipHorizontal: false,   // flip e.g for video
  imageScaleFactor: 0.7,  // reduce input image size for gains in speed.
  maxNumBoxes: 1,        // maximum number of boxes to detect
  iouThreshold: 0.5,      // ioU threshold for non-max suppression
  scoreThreshold: 0.79,    // confidence threshold for predictions.
}

navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia;

//Select everything in my html
const video = document.querySelector('#video');
const canvas = document.querySelector('#canvas');
const targetText = document.querySelector('#target');
targetText.style.opacity = "0%";
let isCallingMotor = false;
const context = canvas.getContext('2d');
let model;

const $uptime = $('#uptime');

handTrack.startVideo(video)
	.then(status => {
		if(status){
			navigator.getUserMedia({video: {}}, stream => {
				video.srcObject = stream;
				setInterval(runDetection, 100);
			},
			err => console.log(err)
			);
		}
	});

/************ */
function runDetection(){
	model.detect(video).then(predictions => {
		// console.log(predictions); // Array[]: emty array

		model.renderPredictions(predictions, canvas, context, video);
		if(predictions.length > 0){
			let hand1 = predictions[0].bbox;
			let x = hand1[0];
			let y = hand1[1];
			var output = {
				gpio: 27,
				state: 0,
				time: Number.parseInt($uptime.text())+1,
			};
			console.log("x: " + x);
			console.log("y: " + y);
			/*if(y > 0){
				if (x < 200){
					targetText.style.opacity = "0%";
				} else if(x > 400){
						targetText.style.opacity = "100%";
					} else if(x > 300){
							targetText.style.opacity = "60%";
						} else if(x > 200){
								targetText.style.opacity = "30%";
							}
			}*/
			if(x >= 200 && x <= 300){
				if(y >= 100 && y <= 200){
					targetText.style.opacity = "100%";
					if(output.state == 1) {
						output.state = 0;
						// addMotorEvent(output);
						// return;
					}
				}
			} else {
				targetText.style.opacity = "0%";
				if(output.state == 0) {
					output.state = 1;
					// addMotorEvent(output);
					// return;
				}
			}
			console.log(output.state);
		}
	});
}

handTrack.load(modelParams).then(lmodel => {
	model = lmodel;
	});
///////////////////////////// REST-API GPIO Control /////////////////////////////
/***
	httpPie bash commands for check out:
		- http https://192.168.0.103/api/uptime --verify no
		- http https://192.168.0.103/api/events --verify no
		- http POST https://192.168.0.103/api/events gpio=2 state=1 time=100 --verify no
		- http DELETE https://192.168.0.103/api/events/0 --verify no
***/
// Local copy of the event list and uptime
let events = [];
let uptime = 0;

// This function synchronizes the uptime every 10s
function updateUptime() {
  $.ajax({
	// Target
	url: '/api/uptime',
	// Method
	type: 'GET',
	// Data we expect back
	dataType: 'json',
  }).done(res => {
	// Update now and keep track for 10s
	$uptime.text(res.uptime);
	for(let i = 0; i < 10; i++) {
	  const t = res.uptime + i;
	  setTimeout(() => {
		uptime = t;
		$uptime.text(t);
		updateTable();
	  }, i*1000);
	}
  }).always(() => {
	// Synchronize again after 10s
	setTimeout(updateUptime, 10000);
  });
}

// This function will update the event list every 60s
function updateEventlist() {
  $.ajax({
	// Target
	url: '/api/events',
	// Method
	type: 'GET',
	// Data we expect back
	dataType: 'json',
  }).done(res => {
	// Replace list in-place
	while(events.length > 0) events.pop();
	res.forEach(e => events.push(e));
	updateTable();
  }).always(() => {
	// Poll again after 60s
	// The add and delete method keep the list synchronized.
	setTimeout(updateUptime, 60000);
  });
}

// Adds an event based on the form
function addEvent() {
  let output = {
	gpio: Number.parseInt($('#evGPIO').val()),
	state: $('#evState').is(':checked') ? 1 : 0,
	time: Number.parseInt($('#evTime').val()),
  };

  $.ajax({
		// Target
		url: '/api/events',
		type: 'POST',
		// Data we expect back
		dataType: 'json',
		// We will send json, so set the content type
		contentType: "application/json; charset=utf-8",
		// The data we send. JSON.stringify creates json from this object
		data: JSON.stringify(output),
	}).done(addedEvent => {
		// Handles successful responses only
		events.push(addedEvent);
		updateTable();
		console.log(JSON.stringify(output));
	}).fail(() => {
		// Handles errors only
		alert('Adding the event failed. Request: ' + JSON.stringify(output));
	});
}

// Adds an motor event based on the form
function addMotorEvent(handtrackRequest) {
	$.ajax({
	  // Target
	  url: '/api/events',
	  type: 'POST',
	  // Data we expect back
	  dataType: 'json',
	  // We will send json, so set the content type
	  contentType: "application/json; charset=utf-8",
	  // The data we send. JSON.stringify creates json from this object
	  data: JSON.stringify(handtrackRequest),
	}).done(addedEvent => {
		// Handles successful responses only
		events.push(addedEvent);
		updateTable();
		console.log(JSON.stringify(handtrackRequest));

		// isCallingMotor = false;
	}).fail(() => {
		// Handles errors only
		alert('Adding the event failed. Request: ' + JSON.stringify(handtrackRequest));
	});
}

// Deletes an event
function deleteEvent(eventid) {
  $.ajax({
	// Target
	url: '/api/events/'+eventid,
	// Data we expect back
	dataType: 'json',
	// We want a delete request
	type: 'DELETE',
  }).done(addedEvent => {
	// in-place filtering
	let tmpEvents = [];
	while(events.length > 0) {
	  let e = events.pop();
	  if (e.id !== eventid) tmpEvents.push(e);
	}
	tmpEvents.forEach(e => events.push(e));
	updateTable();
  }).fail(() => {
	alert('Deleting the event failed.');
  });
}

// Re-renders the event table
function updateTable() {
  sortedEvents = events
	// Filter old events
	.filter(ev => ev.time >= uptime)
	// Sort by time
	.sort((a,b) => a.time===b.time ? 0 : (a.time < b.time ? -1 : 1));
  // Clear table
  $('#tbody').html("");
  // Rewrite table
  sortedEvents.forEach(ev => $('#tbody').append(
	'<tr><td>'+ev.time+'</td><td>GPIO'+ev.gpio+'</td><td>'+(ev.state===1?'HIGH':'LOW')+'</td>' +
	'<td><button type=\"button\" onClick=\"deleteEvent('+ev.id+');\">Delete</button></td></tr>'
  ));
}

// When the page is ready...
$(document).ready(() => {
  // Initially update uptime:
  updateUptime();

  // Initially poll the events
  updateEventlist();
});