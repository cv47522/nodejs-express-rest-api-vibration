// use "nodemon app.js" instead of "node app.js" to keep watching the latest update
// nodemon Installation: sudo npm -g nodemon

const Joi = require('joi'); // schema validation
const express = require('express');
const app = express();

app.use(express.json());

const courses = [
    {id: 1, name: 'course 1'},
    {id: 2, name: 'course 2'},
    {id: 3, name: 'course 3'}
];

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.get('/api/courses', (req, res) => {
    res.send(courses);
});

app.get('/api/courses/:id', (req, res) => {
    const course = courses.find(c => c.id === parseInt(req.params.id))
    if (!course) res.status(404).send('The course with given ID was not found.') // null course
    res.send(course);
})

app.get('/api/posts/:year/:month', (req, res) => {
     // output JSON: {"year": "2018", "month": "1"}
     // with URL: http://localhost:3000/api/p[osts/2018/1
    res.send(req.params);
})

app.post('/api/courses', (req, res) => {
    // Validate
    // If invalid, return 400 - Bad request
    // unpack error from the Joi validate method
    const { error } = validateCourse(req.body);
    if (error) {
        // res.status(400).send(result.error); // output all error info
        res.status(400).send(result.error.details[0].message); // output specific error info
        return; // return the value of the above line
    }

    const course = {
        id: courses.length + 1,
        name: req.body.name
    };
    courses.push(course);
    res.send(course);
})

app.put('/api/courses/:id', (req, res) => {
    // Look up the course
    // If not existing, return 404
    const course = courses.find(c => c.id === parseInt(req.params.id))
    if (!course) return res.status(404).send('The course with given ID was not found.') // null course

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
    const course = courses.find(c => c.id === parseInt(req.params.id))
    if (!course) return res.status(404).send('The course with given ID was not found.') // null course

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

function validateCourse(course) {
    const schema = Joi.object({
        name: Joi.string().min(3).required()
    });

    return schema.validate(course);
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