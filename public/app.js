//Select everything in my html
// const targetText = document.querySelector('#target');
// targetText.style.opacity = "0%";

// Local copy of the event list and uptime
let events = [];
let uptime = 0;
const $uptime = $('#uptime');
let isCenter = false;

// Motor GPIO
// const LEFT = 22, RIGHT = 23, TOP = 26, BOTTOM = 27, LED = 25;
// const motorGpioArr = [LEFT, RIGHT, TOP, BOTTOM];
const motorsDictLeft = {
	'THUMB1': 19, 'POINTER1': 26, 'MIDDLE1': 27, 'RING1': 14, 'LITTLE1': 23,
	'THUMB2': 5, 'POINTER2': 13, 'MIDDLE2': 33, 'RING2': 12, 'LITTLE2': 22,
	'UPPALM1': 4, 'DOWNPALM1': 18, 'DOWNPALM2': 17, 'UPPALM2': 16, 'DOWNPALM3': 21,
	'BACK1': 15, 'BACK2': 25, 'BACK3': 32,
}

const motorsDictRight = {
	'THUMB1': 23, 'POINTER1': 12, 'MIDDLE1': 33, 'RING1': 13, 'LITTLE1': 19,
	'THUMB2': 22, 'POINTER2': 14, 'MIDDLE2': 27, 'RING2': 26, 'LITTLE2': 5,
	'DOWNPALM1': 21, 'DOWNPALM2': 18, 'UPPALM1': 4, 'UPPALM2': 32, 'DOWNPALM3': 17,
	'BACK1': 16, 'BACK2': 15, 'BACK3': 25,
}

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
			// state: 1, // digital
			state: 150, // analog
			time: Number.parseInt($uptime.text()) + 1
		})
	// }
}

function turnOffMotors() {
	for(let key in motorsDictLeft) {
		outputs.push({
			gpio: motorsDictLeft[key],
			state: 0,
			time: Number.parseInt($uptime.text())
		})
	}

	for(let key in motorsDictRight) {
		outputs.push({
			gpio: motorsDictRight[key],
			state: 0,
			time: Number.parseInt($uptime.text())
		})
	}
}
///////////////////////////// REST-API GPIO Control /////////////////////////////
/***
	httpPie bash commands for check out:
		- http https://192.168.0.103/api/uptime --verify no
		- http http://localhost:3000/api/courses --verify no
		- http https://192.168.0.103/api/events --verify no
		- http POST https://10.100.5.78/api/events gpio=23 state=100 time=120 --verify no
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
		// digitalState: $('#evDigitalState').is(':checked') ? 1 : 0,
		state: Number.parseInt($('#evAnalogState').val()), // analog
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
	'<tr><td>'+ev.time+'</td><td>'+$('#evGPIO').find(":selected").text()+': IO'+ev.gpio +'</td><td>'+ev.state+'</td>' + // analog state
	'<td><button type=\"button\" class=\"button\" onClick=\"deleteEvent('+ev.id+');\">Delete</button></td></tr>'
	// '</td><td>'+(ev.digitalState===1?'HIGH':'LOW') +
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
