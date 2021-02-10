//Select everything in my html
const video = document.querySelector('#webcam-video');
const canvas = document.querySelector('#canvas');
const targetText = document.querySelector('#target');
targetText.style.opacity = "0%";
const context = canvas.getContext('2d');
let model;

// Local copy of the event list and uptime
let events = [];
let uptime = 0;
const $uptime = $('#uptime');
// let isDirection = [false, false, false, false, false]; // Center, Left, Right, Top, Bottom
let isCenter = false;

// Motor GPIO
const LEFT = 22, RIGHT = 23, TOP = 26, BOTTOM = 27, LED = 25;
const motorGpioArr = [LEFT, RIGHT, TOP, BOTTOM];

const modelParams = {
  flipHorizontal: false,   // flip e.g for video
  imageScaleFactor: 0.7,  // reduce input image size for gains in speed.
  maxNumBoxes: 1,        // maximum number of boxes to detect
  iouThreshold: 0.5,      // ioU threshold for non-max suppression
  scoreThreshold: 0.79,    // confidence threshold for predictions.
}


// When the page is ready...
$(document).ready(() => {
	// Initially update uptime:
	updateUptime();

	// Initially poll the events
	updateEventlist();

	navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia;

	handTrack.load(modelParams).then(lmodel => {
		model = lmodel;
	});

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

	deleteOlderRequest();
});

let outputs = []; // max length == 4

function isStateChanged(addedEvent) { // return true/false
	if (events.length > 0) {
	  const isExisting = events.some(e => {
		return addedEvent.time === e.time && addedEvent.gpio === e.gpio;
	  });
	  const gpioArr = events.map(e => e.gpio);
	  const idx = gpioArr.lastIndexOf(addedEvent.gpio) // -1: not found

	  if (!isExisting && idx !== -1) { // event not exists && it has previous state
		  return events[idx].state !== addedEvent.state;
	  } else {
	   return false; // event exists
	  }
	} else {
		return true;
	}
}

function turnOnPin(pin) {
	// if (outputs.length === 0) {
		outputs.push({
			gpio: pin,
			state: 1,
			time: Number.parseInt($uptime.text()) + 1
		})
	// }
}

function turnOffMotors() {
	// if (outputs.length === 0) {
		for(let i=0; i<motorGpioArr.length; i++) {
			outputs.push({
				gpio: motorGpioArr[i],
				state: 0,
				time: Number.parseInt($uptime.text())
			})
		}
	// }
}
/************ */
function runDetection(){
	model.detect(video).then(predictions => {
		// console.log(predictions); // Array[]: empty array

		model.renderPredictions(predictions, canvas, context, video);
		if(predictions.length > 0){
			let hand1 = predictions[0].bbox;
			let x = hand1[0];
			let y = hand1[1];

			// let outputs = [];

			console.log("x: " + x);
			console.log("y: " + y);

			// if(x >= 200 && x <= 300){
			// 	if(y >= 100 && y <= 200){
			// 		targetText.style.opacity = "100%";
			// 		if(output.state === 1) {
			// 			output.state = 0;
			// 			// check if there is any event with the current uptime/unique value of the 'time' property
			// 			// if yes, do nothing
			// 			// if no, add the new event
			// 		}
			// 	}
			// } else {
			// 	targetText.style.opacity = "0%";
			// 	if(output.state === 0) {
			// 		output.state = 1;
			// 	}
			// }
				if (y >= 100 && y <= 200) {
					if (x < 200) {   // Right
						targetText.style.opacity = "0%";
						turnOffMotors();
						turnOnPin(RIGHT);
					} else if (x >= 200 && x <= 300) { // Center
						targetText.style.opacity = "100%";
						turnOffMotors();
					} else {  // Left
						targetText.style.opacity = "0%";
						turnOffMotors();
						turnOnPin(LEFT);
					}
				} else if (x >= 200 && x <= 300 && y < 100) {
						targetText.style.opacity = "0%";
						turnOffMotors();
						turnOnPin(TOP);
				} else if (x >= 200 && x <= 300 && y > 200) {
					targetText.style.opacity = "0%";
					turnOffMotors();
					turnOnPin(BOTTOM);
				} else {
					turnOffMotors();
				}

			// let eventTimeArr = events.map(event => { return event.time; });
			// some() method tests whether at least one element in the array passes the test
			// let isEventDuplicate = eventTimeArr.some((item, idx) => {
			// 	return eventTimeArr.indexOf(item) !== idx;
			// });

			// let isEventExist = eventTimeArr.some(item => {
			// 	return item === Number.parseInt($uptime.text());
			// });


			outputs.forEach(e => {
				if (isStateChanged(e)) addMotorEvent(e);
			});
			outputs = [];
			// deleteOlderRequest();

			// if (!isEventExist) {
			// 	outputs.forEach(out => { addMotorEvent(out); });
			// 	// addMotorEvent(output);
			// }
				// events.forEach(event => {
				// 	if(event.time < uptime){
				// 		deleteEvent(event.id);
					// events.splice(0, 1);
				// });
			// }


			// console.log(`Uptime: ${uptime}s, output.Time: ${output.time}s, state: ${output.state}`);
			console.log(`Uptime: ${uptime}s`);
			console.log('Outputs:');
			console.log(outputs);
			console.log('Events:');
			console.log(events);
		}
	});
}

// function turnOnOffMotors(arr, exclude = null) {
// 	for (let i = 0; i < motorGpioArr.length; i++) {
// 		arr.push({
// 			gpio: motorGpioArr[i],
// 			state: 0,
// 			time: Number.parseInt($uptime.text())
// 		});
// 	}
// 	if (exclude != null) {
// 		arr.push({
// 			gpio: exclude,
// 				state: 1,
// 				time: Number.parseInt($uptime.text()) + 1
// 		});
// 	}
// }
///////////////////////////// REST-API GPIO Control /////////////////////////////
/***
	httpPie bash commands for check out:
		- http https://192.168.0.103/api/uptime --verify no
		- http https://192.168.0.103/api/events --verify no
		- http POST https://192.168.0.103/api/events gpio=2 state=1 time=100 --verify no
		- http DELETE https://192.168.0.103/api/events/0 --verify no
***/
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
	let event = {
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
		data: JSON.stringify(event)
	}).done(addedEvent => {
		// Handles successful responses only
		events.push(addedEvent);
		updateTable();
		console.log(JSON.stringify(event));
	}).fail(() => {
		// Handles errors only
		// alert('Adding the event failed. Request: ' + JSON.stringify(event));
		console.log('Adding the event failed. Request: ' + JSON.stringify(event));
	});
}

// let currentRequest = null;

// Adds an motor event based on the form
function addMotorEvent(e) {
	// if (isStateChanged(e)) {
		$.ajax({
			// Target
			url: '/api/events',
			type: 'POST',
			// Data we expect back
			dataType: 'json',
			// We will send json, so set the content type
			contentType: "application/json; charset=utf-8",
			// The data we send. JSON.stringify creates json from this object
			data: JSON.stringify(e),
			}).done(addedEvent => {
				// Handles successful responses only
				events.push(addedEvent);
				updateTable();
				console.log(JSON.stringify(e));

				// isCallingMotor = false;
			}).fail(() => {
				// Handles errors only
				// alert('Adding the event failed. Request: ' + JSON.stringify(e));
				console.log('Adding the event failed. Request: ' + JSON.stringify(e));
		});
	// }
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
	// alert('Deleting the event failed.');
	console.log('Deleting the event failed.');
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
	'<td><button type=\"button\" class=\"button\" onClick=\"deleteEvent('+ev.id+');\">Delete</button></td></tr>'
  ));
}

function deleteOlderRequest() {
	setInterval(() => {
		if (events.length > 0) {
			events.forEach(e => {
				if (e.time < (uptime-2)){
					deleteEvent(e.id);
				}
			  });
		}
	  }, 3000);
}
