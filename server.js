const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        port : 5432,
        user : 'postgres',
        password : 'ignatt',
        database : 'letsdo'
    }
  });

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    db.select('*').from('users')
        .then(user => console.log(user));
    res.send('success');
})

app.post('/register', (req, res) => {
    const { firstname, username, password } = req.body;
    const hash = bcrypt.hashSync(password);

    db.transaction( trx => {
        trx.insert({
            username,
            hash
        })
        .into('login')
        .returning('username')
        .then( loginUsername => {
            return trx('users')
                    .returning('*')
                    .insert({
                        firstname,
                        username,
                        username: loginUsername[0].username,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unableToRegister'));
})

app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json('Incorrect form submission!')
    }
    db.select('username', 'hash').from('login')
    .where('username', '=', username)
    .then(data => {
        const isValid = bcrypt.compareSync(password, data[0].hash);
        if (isValid) {
            return db.select('*').from('users')
                        .where('username', '=', username)
                        .then(user => {
                            res.json(user[0]);
                        })
        } else {
            return res.status(400).json('invalidEmailorPassword')
        }
    })
    .catch(err => res.status(400).json('unableToLogin'))
})      

app.post('/addtask', (req,res) => {
    const { taskTitle, taskDescription, dueDate, id } = req.body;
    db('tasks')
        .returning('*')
        .insert({
            user_id: id,
            task_name: taskTitle,
            task_description: taskDescription,
            status: 'pending',
            created_at: new Date(),
            due_date: dueDate
        })
        .then(task => {
            res.json(task[0]);
        })
        .catch(err => res.status(400).json('Unable to add task!'))
})

app.post('/tasks', (req,res) => {
    const {id} = req.body;
    db.select('*').from('tasks')
        .where('user_id', '=', id)
        .then(tasks => res.json(tasks))
        .catch(err => res.status(400).json('Failed to get tasks!'))
})

app.post('/delbtn', (req, res) => {
    const {taskId} = req.body;
    db.select('*').from('tasks')
        .where('task_id', '=', taskId)
        .del()
        .catch(err => res.status(400).json('Unable to delete!'))
    res.status(200).json('Deleted!');
})

app.put('/completetask', (req, res) => {
    const {taskId, user_id} = req.body;
    db('users').where('id' , '=', user_id)
        .increment('completedtasks', 1)
        .returning('completedtasks')
        .then( data => {
            res.json(data[0].completedtasks)
        })
        .catch(err => res.status(400).json('Unable to update completed tasks!'))
    
    db.select('*').from('tasks')
        .where('task_id', '=', taskId)
        .del()
        .catch(err => res.status(400).json('Unable to delete task after completion!'))
    
})

app.put('/destination', (req, res) => {
    const {taskId, destination} = req.body;
    if (destination === 'pending') {
        db('tasks').where('task_id', '=', taskId)
            .update({
                status: 'pending'
            })
            .returning('status')
            .then(data => {
                res.json('success');
            })
            .catch(err => res.status(400).json('Unable to switch inProgress'))
    } else if (destination === 'inProgress') {
        db('tasks').where('task_id', '=', taskId)
            .update({
                status: 'inProgress'
            })
            .returning('status')
            .then(data => {
                res.json('success');
            })
            .catch(err => res.status(400).json('Unable to switch inProgress'))
    } else if (destination === 'completed') {
        db('tasks').where('task_id', '=', taskId)
            .update({
                status: 'completed'
            })
            .returning('status')
            .then(data => {
                res.json('success');
            })
            .catch(err => res.status(400).json('Unable to switch completed'))
    }
})

app.listen(3000);