// use "nodemon app.js" instead of "node app.js" to keep watching the latest update
// nodemon Installation: sudo npm -g nodemon

const Joi = require('joi'); // schema validation
const express = require('express');
const app = express();

// Server JSON API
app.use(express.json());
// Serve static files in the 'public' folder
app.use(express.static('public'));

const courses = [
    {id: 1, name: 'course 1'},
    {id: 2, name: 'course 2'},
    {id: 3, name: 'course 3'}
];

let seconds = 0; // Timer
setInterval(() => {
    seconds++;
    // console.log(seconds);
}, 1000);

const events = [];

/***
	httpPie bash commands for check out:
		- http https://localhost:3000/api/uptime --verify no
		- http http://localhost:3000/api/courses --verify no
        - http POST http://localhost:3000/api/courses name="hello"
		- http http://localhost:3000/api/events --verify no
		- http POST http://localhost:3000/api/events gpio=2 state=1 time=100 --verify no
		- http DELETE http://localhost:3000/api/events/0 --verify no
***/
app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.get('/api/uptime',(req,res) => {
    let systemUptime = {uptime: seconds};
    res.send(systemUptime);
});

app.get('/api/events', (req, res) => {
    res.send(events);
});

app.post('/api/events', (req, res) => {
    // Validate
    // If invalid, return 400 - Bad request
    // unpack error from the Joi validate method
    const { error } = validateEvents(req.body);
    if(error) return res.status(400).send(error.details[0].message);

    const event = {
        id: events.length,
        gpio: req.body.gpio,
        // digitalState: req.body.digitalState,
        state: req.body.state, // analog state
        time: req.body.time
    };
    events.push(event);
    res.send(event);
});

app.delete('/api/events/:id', (req, res) => {
    // Look up the course
    // If not existing, return 404
    const event = events.find(e => e.id === parseInt(req.params.id));
    if (!event) return res.status(400).send('The event with given ID was not found.'); // null event

    // Delete
    const index = events.indexOf(event);
    events.splice(index, 1);
    res.send(event);
});

app.get('/api/courses', (req, res) => {
    res.send(courses);
});

app.get('/api/courses/:id', (req, res) => {
    const course = courses.find(c => c.id === parseInt(req.params.id))
    if (!course) res.status(404).send('The course with given ID was not found.') // null course
    res.send(course);
});

app.get('/api/posts/:year/:month', (req, res) => {
     // output JSON: {"year": "2018", "month": "1"}
     // with URL: http://localhost:3000/api/p[osts/2018/1
    res.send(req.params);
});

app.post('/api/courses', (req, res) => {
    // Validate
    // If invalid, return 400 - Bad request
    // unpack error from the Joi validate method
    const { error } = validateCourse(req.body);
    if (error) {
        // res.status(400).send(error); // output all error info
        res.status(400).send(error.details[0].message); // output specific error info
        return; // return the value of the above line
    }

    const course = {
        id: courses.length + 1,
        name: req.body.name
    };
    courses.push(course);
    res.send(course);
});

app.put('/api/courses/:id', (req, res) => {
    // Look up the course
    // If not existing, return 404
    const course = courses.find(c => c.id === parseInt(req.params.id))
    if (!course) return res.status(404).send('The course with given ID was not found.'); // null course

    // Validate
    // If invalid, return 400 - Bad request
    // unpack error from the Joi validate method
    const { error } = validateCourse(req.body);
    if (error) return res.status(400).send(error.details[0].message); // output specific error info


    // Update course
    course.name = req.body.name;
    // Return the updated course
    res.send(course);
});

app.delete('/api/courses/:id', (req, res) => {
    // Look up the course
    // If not existing, return 404
    const course = courses.find(c => c.id === parseInt(req.params.id));
    if (!course) return res.status(404).send('The course with given ID was not found.'); // null course

    // Delete
    const index = courses.indexOf(course);
    courses.splice(index, 1);

    // Return the same course
    res.send(course);
});

// PORT: use either the env variable set w/ bash command "export PORT=5000"
// or 3000
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listeing on port ${port}...`))

// function test(t){
// 	if (t === undefined) console.log(t);
// 	return t;
// }

function validateCourse(course) {
    const schema = Joi.object({
        name: Joi.string().min(3).required()
    });

    return schema.validate(course);
}

function validateEvents(event) {
    const schema = Joi.object({
        gpio: Joi.number().integer().required(),
        // digitalState: Joi.number().integer().valid(0, 1).required(),
        state: Joi.number().integer().required(), // analog
        time: Joi.number().integer().required()
    });

    return schema.validate(event);
}
// const http = require('http');
// const server = http.createServer((req, res) => {
//     if (req.url === '/') {
//         res.write('Hello World');
//         res.end();
//     }

//     if (req.url === '/api/courses') {
//         res.write(JSOON.stringify([1, 2, 3]));
//         res.end();
//     }
// })
// server.listen(3000);
// console.log('Listeing on port 3000...');